import { Router, Request, Response } from 'express'
import { query, queryOne, execute } from '../db/postgres'
import { requireAuth } from '../middleware/auth'

const router = Router()

const MAX_NAME_LENGTH = 200

// GET /api/categories — list all categories (public)
router.get('/', async (_req: Request, res: Response) => {
  const categories = await query('SELECT * FROM categories ORDER BY sort_order ASC, id ASC')
  res.json(categories)
})

// GET /api/categories/:id — get single category (public)
router.get('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid category id' })
    return
  }

  const category = await queryOne('SELECT * FROM categories WHERE id = $1', [id])
  if (!category) {
    res.status(404).json({ error: 'Category not found' })
    return
  }

  res.json(category)
})

// POST /api/categories — create category (auth required)
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { name_ar, name_en, sort_order } = req.body

  if (!name_ar || typeof name_ar !== 'string' || name_ar.trim() === '') {
    res.status(400).json({ error: 'name_ar is required and must be a non-empty string' })
    return
  }
  if (!name_en || typeof name_en !== 'string' || name_en.trim() === '') {
    res.status(400).json({ error: 'name_en is required and must be a non-empty string' })
    return
  }

  if (name_ar.length > MAX_NAME_LENGTH) {
    res.status(400).json({ error: `name_ar must be ${MAX_NAME_LENGTH} characters or less` })
    return
  }
  if (name_en.length > MAX_NAME_LENGTH) {
    res.status(400).json({ error: `name_en must be ${MAX_NAME_LENGTH} characters or less` })
    return
  }

  const result = await query(
    'INSERT INTO categories (name_ar, name_en, sort_order) VALUES ($1, $2, $3) RETURNING *',
    [name_ar.trim(), name_en.trim(), sort_order ?? 0]
  )

  res.status(201).json(result[0])
})

// PUT /api/categories/:id — update category (auth required)
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid category id' })
    return
  }

  const { name_ar, name_en, sort_order } = req.body

  const existing = await queryOne('SELECT * FROM categories WHERE id = $1', [id])
  if (!existing) {
    res.status(404).json({ error: 'Category not found' })
    return
  }

  if (name_ar !== undefined && (typeof name_ar !== 'string' || name_ar.trim() === '')) {
    res.status(400).json({ error: 'name_ar must be a non-empty string' })
    return
  }
  if (name_en !== undefined && (typeof name_en !== 'string' || name_en.trim() === '')) {
    res.status(400).json({ error: 'name_en must be a non-empty string' })
    return
  }
  if (name_ar !== undefined && name_ar.length > MAX_NAME_LENGTH) {
    res.status(400).json({ error: `name_ar must be ${MAX_NAME_LENGTH} characters or less` })
    return
  }
  if (name_en !== undefined && name_en.length > MAX_NAME_LENGTH) {
    res.status(400).json({ error: `name_en must be ${MAX_NAME_LENGTH} characters or less` })
    return
  }

  const updates: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (name_ar !== undefined) { updates.push(`name_ar = $${paramIndex++}`); values.push(name_ar.trim()) }
  if (name_en !== undefined) { updates.push(`name_en = $${paramIndex++}`); values.push(name_en.trim()) }
  if (sort_order !== undefined) { updates.push(`sort_order = $${paramIndex++}`); values.push(sort_order) }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' })
    return
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')
  values.push(id)

  await query(`UPDATE categories SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values)

  const category = await queryOne('SELECT * FROM categories WHERE id = $1', [id])
  res.json(category)
})

// DELETE /api/categories/:id — delete category (auth required)
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid category id' })
    return
  }

  const existing = await queryOne('SELECT * FROM categories WHERE id = $1', [id])
  if (!existing) {
    res.status(404).json({ error: 'Category not found' })
    return
  }

  await execute('DELETE FROM categories WHERE id = $1', [id])
  res.status(204).send()
})

export default router
