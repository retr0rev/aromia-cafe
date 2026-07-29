import { Router, Request, Response } from 'express'
import { query, queryOne, execute } from '../db/postgres'
import { authMiddleware } from '../middleware/auth'

const router = Router()

const MAX_POPULAR = 4

// GET /api/popular — get popular items (public)
router.get('/', async (_req: Request, res: Response) => {
  const rows = await query(`
    SELECT i.*, c.name_ar as category_name_ar, c.name_en as category_name_en
    FROM items i
    JOIN categories c ON i.category_id = c.id
    WHERE i.is_popular = 1
    ORDER BY i.sort_order ASC
    LIMIT $1
  `, [MAX_POPULAR])

  res.json(rows)
})

// PUT /api/popular — set popular items (auth required)
router.put('/', authMiddleware, async (req: Request, res: Response) => {
  const { item_ids } = req.body

  if (!Array.isArray(item_ids)) {
    res.status(400).json({ error: 'item_ids must be an array' })
    return
  }

  if (item_ids.length > MAX_POPULAR) {
    res.status(400).json({ error: `Cannot select more than ${MAX_POPULAR} popular items` })
    return
  }

  // Validate all IDs are numbers
  const ids = item_ids.map(Number)
  if (ids.some(Number.isNaN)) {
    res.status(400).json({ error: 'All item_ids must be numbers' })
    return
  }

  // Verify all items exist
  if (ids.length > 0) {
    const placeholders = ids.map((_: any, i: number) => `$${i + 1}`).join(', ')
    const existing = await query(`SELECT id FROM items WHERE id IN (${placeholders})`, ids)
    if (existing.length !== ids.length) {
      res.status(400).json({ error: 'One or more item_ids do not exist' })
      return
    }
  }

  // Clear all popular flags
  await execute('UPDATE items SET is_popular = 0 WHERE is_popular = 1')

  // Set new popular items
  if (ids.length > 0) {
    const placeholders = ids.map((_: any, i: number) => `$${i + 1}`).join(', ')
    await execute(`UPDATE items SET is_popular = 1, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`, ids)
  }

  res.json({ message: 'Popular items updated', item_ids: ids })
})

export default router
