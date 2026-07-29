import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Router } from 'express'

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

// ── Auth Middleware ───────────────────────────────────────────────────
interface JwtPayload { id: number; username: string }

declare global {
  namespace Express {
    interface Request { admin?: JwtPayload }
  }
}

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' })
    return
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as JwtPayload
    req.admin = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// ── Auth Routes ──────────────────────────────────────────────────────
const authRouter = Router()

authRouter.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body
  if (!username || !password) {
    res.status(400).json({ error: 'Missing credentials' })
    return
  }
  const admin = await queryOne('SELECT * FROM admin WHERE username = $1', [username]) as any
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' })
  res.json({ token, admin: { id: admin.id, username: admin.username } })
})

authRouter.get('/verify', authMiddleware, (req: Request, res: Response) => {
  res.json({ admin: req.admin })
})

authRouter.put('/password', authMiddleware, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    res.status(400).json({ error: 'Invalid input' })
    return
  }
  const admin = await queryOne('SELECT * FROM admin WHERE id = $1', [req.admin!.id]) as any
  if (!bcrypt.compareSync(currentPassword, admin.password_hash)) {
    res.status(401).json({ error: 'Wrong password' })
    return
  }
  const hash = bcrypt.hashSync(newPassword, 10)
  await execute('UPDATE admin SET password_hash = $1 WHERE id = $2', [hash, req.admin!.id])
  res.json({ message: 'Password updated' })
})

// ── Categories Routes ────────────────────────────────────────────────
const categoriesRouter = Router()

categoriesRouter.get('/', async (_req: Request, res: Response) => {
  const rows = await query('SELECT * FROM categories ORDER BY sort_order ASC, id ASC')
  res.json(rows)
})

categoriesRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { name_ar, name_en, sort_order } = req.body
  if (!name_ar || !name_en) {
    res.status(400).json({ error: 'name_ar and name_en required' })
    return
  }
  const result = await query(
    'INSERT INTO categories (name_ar, name_en, sort_order) VALUES ($1, $2, $3) RETURNING *',
    [name_ar, name_en, sort_order ?? 0]
  )
  res.status(201).json(result[0])
})

categoriesRouter.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const { name_ar, name_en, sort_order } = req.body
  const updates: string[] = []
  const values: unknown[] = []
  let i = 1
  if (name_ar !== undefined) { updates.push(`name_ar = $${i++}`); values.push(name_ar) }
  if (name_en !== undefined) { updates.push(`name_en = $${i++}`); values.push(name_en) }
  if (sort_order !== undefined) { updates.push(`sort_order = $${i++}`); values.push(sort_order) }
  if (updates.length === 0) { res.status(400).json({ error: 'No fields' }); return }
  updates.push('updated_at = CURRENT_TIMESTAMP')
  values.push(id)
  await query(`UPDATE categories SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values)
  const category = await queryOne('SELECT * FROM categories WHERE id = $1', [id])
  res.json(category)
})

categoriesRouter.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  await execute('DELETE FROM categories WHERE id = $1', [Number(req.params.id)])
  res.status(204).send()
})

// ── Items Routes ─────────────────────────────────────────────────────
const itemsRouter = Router()

itemsRouter.get('/', async (req: Request, res: Response) => {
  const catId = req.query.category_id
  let rows
  if (catId) {
    rows = await query('SELECT * FROM items WHERE category_id = $1 ORDER BY sort_order ASC', [Number(catId)])
  } else {
    rows = await query('SELECT * FROM items ORDER BY sort_order ASC')
  }
  res.json(rows)
})

itemsRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { name_ar, name_en, ingredients_ar, ingredients_en, price, category_id, sort_order, image_path } = req.body
  if (!name_ar || !name_en || price === undefined || !category_id) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }
  const result = await query(
    `INSERT INTO items (category_id, name_ar, name_en, ingredients_ar, ingredients_en, price, image_path, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [category_id, name_ar, name_en, ingredients_ar || '', ingredients_en || '', Number(price), image_path || null, sort_order ?? 0]
  )
  res.status(201).json(result[0])
})

itemsRouter.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const { name_ar, name_en, ingredients_ar, ingredients_en, price, category_id, sort_order, image_path, is_popular } = req.body
  const updates: string[] = []
  const values: unknown[] = []
  let i = 1
  if (name_ar !== undefined) { updates.push(`name_ar = $${i++}`); values.push(name_ar) }
  if (name_en !== undefined) { updates.push(`name_en = $${i++}`); values.push(name_en) }
  if (ingredients_ar !== undefined) { updates.push(`ingredients_ar = $${i++}`); values.push(ingredients_ar) }
  if (ingredients_en !== undefined) { updates.push(`ingredients_en = $${i++}`); values.push(ingredients_en) }
  if (price !== undefined) { updates.push(`price = $${i++}`); values.push(Number(price)) }
  if (category_id !== undefined) { updates.push(`category_id = $${i++}`); values.push(Number(category_id)) }
  if (image_path !== undefined) { updates.push(`image_path = $${i++}`); values.push(image_path) }
  if (is_popular !== undefined) { updates.push(`is_popular = $${i++}`); values.push(is_popular ? 1 : 0) }
  if (sort_order !== undefined) { updates.push(`sort_order = $${i++}`); values.push(Number(sort_order)) }
  if (updates.length === 0) { res.status(400).json({ error: 'No fields' }); return }
  updates.push('updated_at = CURRENT_TIMESTAMP')
  values.push(id)
  await query(`UPDATE items SET ${updates.join(', ')} WHERE id = $${i}`, values)
  const item = await queryOne('SELECT * FROM items WHERE id = $1', [id])
  res.json(item)
})

itemsRouter.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  await execute('DELETE FROM items WHERE id = $1', [Number(req.params.id)])
  res.json({ message: 'Deleted' })
})

// ── Popular Routes ───────────────────────────────────────────────────
const popularRouter = Router()

popularRouter.get('/', async (_req: Request, res: Response) => {
  const rows = await query(`
    SELECT i.*, c.name_ar as category_name_ar, c.name_en as category_name_en
    FROM items i JOIN categories c ON i.category_id = c.id
    WHERE i.is_popular = 1 ORDER BY i.sort_order ASC LIMIT 4
  `)
  res.json(rows)
})

popularRouter.put('/', authMiddleware, async (req: Request, res: Response) => {
  const { item_ids } = req.body
  if (!Array.isArray(item_ids)) { res.status(400).json({ error: 'item_ids must be array' }); return }
  await execute('UPDATE items SET is_popular = 0 WHERE is_popular = 1')
  if (item_ids.length > 0) {
    const placeholders = item_ids.map((_: any, i: number) => `$${i + 1}`).join(', ')
    await execute(`UPDATE items SET is_popular = 1, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`, item_ids)
  }
  res.json({ message: 'Updated', item_ids })
})

// ── Settings Routes ──────────────────────────────────────────────────
const settingsRouter = Router()

settingsRouter.get('/', async (_req: Request, res: Response) => {
  const rows = await query('SELECT key, value FROM settings')
  const settings: Record<string, string> = {}
  for (const row of rows as any[]) settings[row.key] = row.value
  res.json(settings)
})

settingsRouter.put('/', authMiddleware, async (req: Request, res: Response) => {
  const updates = req.body
  const results: Record<string, string> = {}
  for (const [key, value] of Object.entries(updates)) {
    if (typeof value !== 'string') continue
    await query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, value])
    results[key] = value
  }
  res.json(results)
})

// ── Express App ──────────────────────────────────────────────────────
const app = express()
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/auth', authRouter)
app.use('/categories', categoriesRouter)
app.use('/items', itemsRouter)
app.use('/popular', popularRouter)
app.use('/settings', settingsRouter)

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

// ── Handler ──────────────────────────────────────────────────────────
let dbReady = false

export default async function handler(req: Request, res: Response) {
  if (!dbReady) {
    await initDatabase()
    dbReady = true
  }
  return app(req, res)
}
