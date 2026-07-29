let pool = null

function getPool() {
  if (!pool) {
    const { Pool } = require('pg')
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      family: 4,
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 15000,
    })
  }
  return pool
}

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

async function q(text, params = []) {
  const r = await getPool().query(text, params)
  return r.rows
}

async function q1(text, params = []) {
  const rows = await q(text, params)
  return rows[0] ?? null
}

async function ex(text, params = []) {
  return getPool().query(text, params)
}

async function init() {
  await q(`CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name_ar TEXT NOT NULL, name_en TEXT NOT NULL, sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`)
  await q(`CREATE TABLE IF NOT EXISTS items (id SERIAL PRIMARY KEY, category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE, name_ar TEXT NOT NULL, name_en TEXT NOT NULL, ingredients_ar TEXT NOT NULL DEFAULT '', ingredients_en TEXT NOT NULL DEFAULT '', price INTEGER NOT NULL, image_path TEXT, is_popular INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`)
  await q(`CREATE TABLE IF NOT EXISTS admin (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`)
  await q(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`)
}

function auth(h) {
  if (!h || !h.startsWith('Bearer ')) return null
  try { return jwt.verify(h.slice(7), JWT_SECRET) } catch { return null }
}

let ready = false

module.exports = async function handler(req, res) {
  try {
    const m = req.method
    const u = (req.url || '').split('?')[0]

    // DEBUG - no DB needed
    if (u === '/api/debug') {
      return res.json({
        DATABASE_URL_set: !!process.env.DATABASE_URL,
        DATABASE_URL_prefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 40) : 'NOT SET',
        JWT_SECRET_set: !!process.env.JWT_SECRET,
        all_env_keys: Object.keys(process.env).filter(k => !k.startsWith('_') && !k.startsWith('npm')).sort(),
      })
    }

    if (u === '/api/health') return res.json({ status: 'ok' })

    if (!ready) { await init(); ready = true }

    if (u === '/api/auth/login' && m === 'POST') {
      const { username, password } = req.body || {}
      if (!username || !password) return res.status(400).json({ error: 'Missing' })
      const a = await q1('SELECT * FROM admin WHERE username = $1', [username])
      if (!a || !bcrypt.compareSync(password, a.password_hash)) return res.status(401).json({ error: 'Invalid' })
      return res.json({ token: jwt.sign({ id: a.id, username: a.username }, JWT_SECRET, { expiresIn: '24h' }), admin: { id: a.id, username: a.username } })
    }

    if (u === '/api/auth/verify' && m === 'GET') {
      const user = auth(req.headers.authorization)
      return user ? res.json({ admin: user }) : res.status(401).json({ error: 'Invalid' })
    }

    if (u === '/api/auth/password' && m === 'PUT') {
      const user = auth(req.headers.authorization)
      if (!user) return res.status(401).json({ error: 'Invalid' })
      const { currentPassword, newPassword } = req.body || {}
      if (!currentPassword || !newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Invalid' })
      const a = await q1('SELECT * FROM admin WHERE id = $1', [user.id])
      if (!bcrypt.compareSync(currentPassword, a.password_hash)) return res.status(401).json({ error: 'Wrong' })
      await ex('UPDATE admin SET password_hash = $1 WHERE id = $2', [bcrypt.hashSync(newPassword, 10), user.id])
      return res.json({ message: 'Updated' })
    }

    if (u === '/api/categories' && m === 'GET') return res.json(await q('SELECT * FROM categories ORDER BY sort_order ASC, id ASC'))

    if (u === '/api/categories' && m === 'POST') {
      if (!auth(req.headers.authorization)) return res.status(401).json({ error: 'Unauthorized' })
      const { name_ar, name_en, sort_order } = req.body || {}
      if (!name_ar || !name_en) return res.status(400).json({ error: 'Required' })
      return res.status(201).json((await q('INSERT INTO categories (name_ar,name_en,sort_order) VALUES ($1,$2,$3) RETURNING *', [name_ar, name_en, sort_order ?? 0]))[0])
    }

    const cm = u.match(/^\/api\/categories\/(\d+)$/)
    if (cm) {
      const id = Number(cm[1])
      if (m === 'PUT') {
        if (!auth(req.headers.authorization)) return res.status(401).json({ error: 'Unauthorized' })
        const { name_ar, name_en, sort_order } = req.body || {}
        const sets = [], v = []; let i = 1
        if (name_ar !== undefined) { sets.push(`name_ar=$${i++}`); v.push(name_ar) }
        if (name_en !== undefined) { sets.push(`name_en=$${i++}`); v.push(name_en) }
        if (sort_order !== undefined) { sets.push(`sort_order=$${i++}`); v.push(sort_order) }
        if (!sets.length) return res.status(400).json({ error: 'No fields' })
        sets.push('updated_at=CURRENT_TIMESTAMP'); v.push(id)
        await ex(`UPDATE categories SET ${sets.join(',')} WHERE id=$${i}`, v)
        return res.json(await q1('SELECT * FROM categories WHERE id=$1', [id]))
      }
      if (m === 'DELETE') {
        if (!auth(req.headers.authorization)) return res.status(401).json({ error: 'Unauthorized' })
        await ex('DELETE FROM categories WHERE id=$1', [id])
        return res.status(204).send('')
      }
    }

    if (u === '/api/items' && m === 'GET') {
      const cid = req.query.category_id
      return res.json(cid ? await q('SELECT * FROM items WHERE category_id=$1 ORDER BY sort_order ASC', [Number(cid)]) : await q('SELECT * FROM items ORDER BY sort_order ASC'))
    }

    if (u === '/api/items' && m === 'POST') {
      if (!auth(req.headers.authorization)) return res.status(401).json({ error: 'Unauthorized' })
      const b = req.body || {}
      if (!b.name_ar || !b.name_en || b.price === undefined || !b.category_id) return res.status(400).json({ error: 'Missing' })
      return res.status(201).json((await q('INSERT INTO items (category_id,name_ar,name_en,ingredients_ar,ingredients_en,price,image_path,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [b.category_id, b.name_ar, b.name_en, b.ingredients_ar||'', b.ingredients_en||'', Number(b.price), b.image_path||null, b.sort_order??0]))[0])
    }

    const im = u.match(/^\/api\/items\/(\d+)$/)
    if (im) {
      const id = Number(im[1])
      if (m === 'PUT') {
        if (!auth(req.headers.authorization)) return res.status(401).json({ error: 'Unauthorized' })
        const b = req.body || {}
        const sets = [], v = []; let i = 1
        if (b.name_ar !== undefined) { sets.push(`name_ar=$${i++}`); v.push(b.name_ar) }
        if (b.name_en !== undefined) { sets.push(`name_en=$${i++}`); v.push(b.name_en) }
        if (b.ingredients_ar !== undefined) { sets.push(`ingredients_ar=$${i++}`); v.push(b.ingredients_ar) }
        if (b.ingredients_en !== undefined) { sets.push(`ingredients_en=$${i++}`); v.push(b.ingredients_en) }
        if (b.price !== undefined) { sets.push(`price=$${i++}`); v.push(Number(b.price)) }
        if (b.category_id !== undefined) { sets.push(`category_id=$${i++}`); v.push(Number(b.category_id)) }
        if (b.image_path !== undefined) { sets.push(`image_path=$${i++}`); v.push(b.image_path) }
        if (b.is_popular !== undefined) { sets.push(`is_popular=$${i++}`); v.push(b.is_popular ? 1 : 0) }
        if (b.sort_order !== undefined) { sets.push(`sort_order=$${i++}`); v.push(Number(b.sort_order)) }
        if (!sets.length) return res.status(400).json({ error: 'No fields' })
        sets.push('updated_at=CURRENT_TIMESTAMP'); v.push(id)
        await ex(`UPDATE items SET ${sets.join(',')} WHERE id=$${i}`, v)
        return res.json(await q1('SELECT * FROM items WHERE id=$1', [id]))
      }
      if (m === 'DELETE') {
        if (!auth(req.headers.authorization)) return res.status(401).json({ error: 'Unauthorized' })
        await ex('DELETE FROM items WHERE id=$1', [id])
        return res.json({ message: 'Deleted' })
      }
    }

    if (u === '/api/popular' && m === 'GET') return res.json(await q("SELECT i.*,c.name_ar as category_name_ar,c.name_en as category_name_en FROM items i JOIN categories c ON i.category_id=c.id WHERE i.is_popular=1 ORDER BY i.sort_order ASC LIMIT 4"))

    if (u === '/api/popular' && m === 'PUT') {
      if (!auth(req.headers.authorization)) return res.status(401).json({ error: 'Unauthorized' })
      const { item_ids } = req.body || {}
      if (!Array.isArray(item_ids)) return res.status(400).json({ error: 'Array required' })
      await ex('UPDATE items SET is_popular=0 WHERE is_popular=1')
      if (item_ids.length) {
        const ph = item_ids.map((_, i) => `$${i+1}`).join(',')
        await ex(`UPDATE items SET is_popular=1,updated_at=CURRENT_TIMESTAMP WHERE id IN (${ph})`, item_ids)
      }
      return res.json({ message: 'Updated', item_ids })
    }

    if (u === '/api/settings' && m === 'GET') {
      const rows = await q('SELECT key,value FROM settings')
      const s = {}
      for (const r of rows) s[r.key] = r.value
      return res.json(s)
    }

    if (u === '/api/settings' && m === 'PUT') {
      if (!auth(req.headers.authorization)) return res.status(401).json({ error: 'Unauthorized' })
      const updates = req.body || {}
      const results = {}
      for (const [k, v] of Object.entries(updates)) {
        if (typeof v !== 'string') continue
        await ex('INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2', [k, v])
        results[k] = v
      }
      return res.json(results)
    }

    return res.status(404).json({ error: 'Not found' })
  } catch (err) {
    console.error('Handler error:', err)
    return res.status(500).json({ error: 'Internal server error', message: err.message })
  }
}