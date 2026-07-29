import { Router, Request, Response } from 'express'
import { query, queryOne, execute } from '../db/postgres'
import { authMiddleware } from '../middleware/auth'

const router = Router()

const ALLOWED_KEYS = [
  'about_ar', 'about_en',
  'tagline_ar', 'tagline_en',
  'address', 'phone', 'hours',
  'instagram', 'facebook',
]

// GET /api/settings — get all settings (public)
router.get('/', async (_req: Request, res: Response) => {
  const rows = await query('SELECT key, value FROM settings')
  const settings: Record<string, string> = {}
  for (const row of rows as any[]) {
    settings[row.key] = row.value
  }
  res.json(settings)
})

// PUT /api/settings — update settings (auth required)
router.put('/', authMiddleware, async (req: Request, res: Response) => {
  const updates = req.body

  if (!updates || typeof updates !== 'object') {
    res.status(400).json({ error: 'Request body must be an object' })
    return
  }

  const results: Record<string, string> = {}

  for (const [key, value] of Object.entries(updates)) {
    if (!ALLOWED_KEYS.includes(key)) continue
    if (typeof value !== 'string') continue

    const existing = await queryOne('SELECT key FROM settings WHERE key = $1', [key])

    if (existing) {
      await execute('UPDATE settings SET value = $1 WHERE key = $2', [value, key])
    } else {
      await execute('INSERT INTO settings (key, value) VALUES ($1, $2)', [key, value])
    }

    results[key] = value
  }

  res.json(results)
})

export default router
