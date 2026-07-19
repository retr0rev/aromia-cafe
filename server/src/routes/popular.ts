import { Router, Request, Response } from 'express';
import db from '../db/index';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/popular — public, get up to 4 popular items
router.get('/', (_req: Request, res: Response) => {
  const items = db
    .prepare(
      `SELECT i.*, c.name_ar AS category_name_ar, c.name_en AS category_name_en
       FROM items i
       JOIN categories c ON c.id = i.category_id
       WHERE i.is_popular = 1
       ORDER BY i.sort_order ASC
       LIMIT 4`,
    )
    .all();

  res.json(items);
});

// PUT /api/popular — auth required, set popular items
router.put('/', authMiddleware, (req: Request, res: Response) => {
  const { item_ids } = req.body as { item_ids?: number[] };

  if (!Array.isArray(item_ids)) {
    res.status(400).json({ error: 'item_ids must be an array' });
    return;
  }

  // Take at most 4
  const ids = item_ids.slice(0, 4);

  const updateAll = db.transaction(() => {
    // Clear all popular flags
    db.prepare('UPDATE items SET is_popular = 0').run();

    // Set new popular items
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`UPDATE items SET is_popular = 1 WHERE id IN (${placeholders})`).run(...ids);
    }
  });

  updateAll();

  res.json({ message: 'Popular items updated', item_ids: ids });
});

export default router;
