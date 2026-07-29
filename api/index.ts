import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

// ── Database ─────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4,
})

async function query(text: string, params: unknown[] = []) {
  const result = await pool.query(text, params)
  return result.rows
}

async function queryOne(text: string, params: unknown[] = []) {
  const rows = await query(text, params)
  return rows[0] ?? null
}

async function execute(text: string, params: unknown[] = []) {
  return pool.query(text, params)
}

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      ingredients_ar TEXT NOT NULL DEFAULT '',
      ingredients_en TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL,
      image_path TEXT,
      is_popular INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS admin (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

// ── Auth ─────────────────────────────────────────────────────────────
function verifyToken(authHeader: string | undefined): any {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  try {
    return jwt.verify(authHeader.slice(7), JWT_SECRET)
  } catch {
    return null
  }
}

// ── Router ───────────────────────────────────────────────────────────
let dbReady = false

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!dbReady) {
    await initDatabase()
    dbReady = true
  }

  const { method } = req
  const url = req.url?.split('?')[0] || ''

  // Health
  if (url === '/api/health' || url === '/api/index') {
    return res.status(200).json({ status: 'ok' })
  }

  // ── AUTH ──
  if (url === '/api/auth/login' && method === 'POST') {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' })
    const admin = await queryOne('SELECT * FROM admin WHERE username = $1', [username]) as any
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' })
    return res.json({ token, admin: { id: admin.id, username: admin.username } })
  }

  if (url === '/api/auth/verify' && method === 'GET') {
    const user = verifyToken(req.headers.authorization)
    if (!user) return res.status(401).json({ error: 'Invalid token' })
    return res.json({ admin: user })
  }

  if (url === '/api/auth/password' && method === 'PUT') {
    const user = verifyToken(req.headers.authorization)
    if (!user) return res.status(401).json({ error: 'Invalid token' })
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Invalid input' })
    }
    const admin = await queryOne('SELECT * FROM admin WHERE id = $1', [user.id]) as any
    if (!bcrypt.compareSync(currentPassword, admin.password_hash)) {
      return res.status(401).json({ error: 'Wrong password' })
    }
    await execute('UPDATE admin SET password_hash = $1 WHERE id = $2', [bcrypt.hashSync(newPassword, 10), user.id])
    return res.json({ message: 'Password updated' })
  }

  // ── CATEGORIES ──
  if (url === '/api/categories' && method === 'GET') {
    const rows = await query('SELECT * FROM categories ORDER BY sort_order ASC, id ASC')
    return res.json(rows)
  }

  if (url === '/api/categories' && method === 'POST') {
    const user = verifyToken(req.headers.authorization)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    const { name_ar, name_en, sort_order } = req.body
    if (!name_ar || !name_en) return res.status(400).json({ error: 'name_ar and name_en required' })
    const result = await query('INSERT INTO categories (name_ar, name_en, sort_order) VALUES ($1, $2, $3) RETURNING *', [name_ar, name_en, sort_order ?? 0])
    return res.status(201).json(result[0])
  }

  const catMatch = url.match(/^\/api\/categories\/(\d+)$/)
  if (catMatch) {
    const id = Number(catMatch[1])
    if (method === 'PUT') {
      const user = verifyToken(req.headers.authorization)
      if (!user) return res.status(401).json({ error: 'Unauthorized' })
      const { name_ar, name_en, sort_order } = req.body
      const u: string[] = [], v: unknown[] = []
      let i = 1
      if (name_ar !== undefined) { u.push(`name_ar = $${i++}`); v.push(name_ar) }
      if (name_en !== undefined) { u.push(`name_en = $${i++}`); v.push(name_en) }
      if (sort_order !== undefined) { u.push(`sort_order = $${i++}`); v.push(sort_order) }
      if (u.length === 0) return res.status(400).json({ error: 'No fields' })
      u.push('updated_at = CURRENT_TIMESTAMP'); v.push(id)
      await query(`UPDATE categories SET ${u.join(', ')} WHERE id = $${i}`, v)
      return res.json(await queryOne('SELECT * FROM categories WHERE id = $1', [id]))
    }
    if (method === 'DELETE') {
      const user = verifyToken(req.headers.authorization)
      if (!user) return res.status(401).json({ error: 'Unauthorized' })
      await execute('DELETE FROM categories WHERE id = $1', [id])
      return res.status(204).send('')
    }
  }

  // ── ITEMS ──
  if (url === '/api/items' && method === 'GET') {
    const catId = req.query.category_id
    let rows
    if (catId) {
      rows = await query('SELECT * FROM items WHERE category_id = $1 ORDER BY sort_order ASC', [Number(catId)])
    } else {
      rows = await query('SELECT * FROM items ORDER BY sort_order ASC')
    }
    return res.json(rows)
  }

  if (url === '/api/items' && method === 'POST') {
    const user = verifyToken(req.headers.authorization)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    const { name_ar, name_en, ingredients_ar, ingredients_en, price, category_id, sort_order, image_path } = req.body
    if (!name_ar || !name_en || price === undefined || !category_id) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    const result = await query(
      'INSERT INTO items (category_id, name_ar, name_en, ingredients_ar, ingredients_en, price, image_path, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [category_id, name_ar, name_en, ingredients_ar || '', ingredients_en || '', Number(price), image_path || null, sort_order ?? 0]
    )
    return res.status(201).json(result[0])
  }

  const itemMatch = url.match(/^\/api\/items\/(\d+)$/)
  if (itemMatch) {
    const id = Number(itemMatch[1])
    if (method === 'PUT') {
      const user = verifyToken(req.headers.authorization)
      if (!user) return res.status(401).json({ error: 'Unauthorized' })
      const { name_ar, name_en, ingredients_ar, ingredients_en, price, category_id, sort_order, image_path, is_popular } = req.body
      const u: string[] = [], v: unknown[] = []
      let i = 1
      if (name_ar !== undefined) { u.push(`name_ar = $${i++}`); v.push(name_ar) }
      if (name_en !== undefined) { u.push(`name_en = $${i++}`); v.push(name_en) }
      if (ingredients_ar !== undefined) { u.push(`ingredients_ar = $${i++}`); v.push(ingredients_ar) }
      if (ingredients_en !== undefined) { u.push(`ingredients_en = $${i++}`); v.push(ingredients_en) }
      if (price !== undefined) { u.push(`price = $${i++}`); v.push(Number(price)) }
      if (category_id !== undefined) { u.push(`category_id = $${i++}`); v.push(Number(category_id)) }
      if (image_path !== undefined) { u.push(`image_path = $${i++}`); v.push(image_path) }
      if (is_popular !== undefined) { u.push(`is_popular = $${i++}`); v.push(is_popular ? 1 : 0) }
      if (sort_order !== undefined) { u.push(`sort_order = $${i++}`); v.push(Number(sort_order)) }
      if (u.length === 0) return res.status(400).json({ error: 'No fields' })
      u.push('updated_at = CURRENT_TIMESTAMP'); v.push(id)
      await query(`UPDATE items SET ${u.join(', ')} WHERE id = $${i}`, v)
      return res.json(await queryOne('SELECT * FROM items WHERE id = $1', [id]))
    }
    if (method === 'DELETE') {
      const user = verifyToken(req.headers.authorization)
      if (!user) return res.status(401).json({ error: 'Unauthorized' })
      await execute('DELETE FROM items WHERE id = $1', [id])
      return res.json({ message: 'Deleted' })
    }
  }

  // ── POPULAR ──
  if (url === '/api/popular' && method === 'GET') {
    const rows = await query(`
      SELECT i.*, c.name_ar as category_name_ar, c.name_en as category_name_en
      FROM items i JOIN categories c ON i.category_id = c.id
      WHERE i.is_popular = 1 ORDER BY i.sort_order ASC LIMIT 4
    `)
    return res.json(rows)
  }

  if (url === '/api/popular' && method === 'PUT') {
    const user = verifyToken(req.headers.authorization)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    const { item_ids } = req.body
    if (!Array.isArray(item_ids)) return res.status(400).json({ error: 'item_ids must be array' })
    await execute('UPDATE items SET is_popular = 0 WHERE is_popular = 1')
    if (item_ids.length > 0) {
      const ph = item_ids.map((_: any, i: number) => `$${i + 1}`).join(', ')
      await execute(`UPDATE items SET is_popular = 1, updated_at = CURRENT_TIMESTAMP WHERE id IN (${ph})`, item_ids)
    }
    return res.json({ message: 'Updated', item_ids })
  }

  // ── SETTINGS ──
  if (url === '/api/settings' && method === 'GET') {
    const rows = await query('SELECT key, value FROM settings')
    const settings: Record<string, string> = {}
    for (const row of rows as any[]) settings[row.key] = row.value
    return res.json(settings)
  }

  if (url === '/api/settings' && method === 'PUT') {
    const user = verifyToken(req.headers.authorization)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    const updates = req.body
    const results: Record<string, string> = {}
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value !== 'string') continue
      await query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, value])
      results[key] = value
    }
    return res.json(results)
  }

  return res.status(404).json({ error: 'Not found' })
}
