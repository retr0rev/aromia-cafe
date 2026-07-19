import { Router, Request, Response } from 'express';
import db from '../db/index';
import { requireAuth } from '../middleware/auth';

const router = Router();

const MAX_NAME_LENGTH = 200;

/** Safely extract a single route param as string (Express 5 typing quirk) */
function paramId(req: Request): string {
  const raw = req.params.id;
  return Array.isArray(raw) ? raw[0] : raw;
}

// GET /api/categories — list all categories (public, no auth)
router.get('/', (_req: Request, res: Response) => {
  const categories = db
    .prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC')
    .all();
  res.json(categories);
});

// GET /api/categories/:id — get single category (public)
router.get('/:id', (req: Request, res: Response) => {
  const id = paramId(req);
  const category = db
    .prepare('SELECT * FROM categories WHERE id = ?')
    .get(id);

  if (!category) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  res.json(category);
});

// POST /api/categories — create category (auth required)
router.post('/', requireAuth, (req: Request, res: Response) => {
  const { name_ar, name_en, sort_order } = req.body;

  // Validate required fields
  if (!name_ar || typeof name_ar !== 'string' || name_ar.trim() === '') {
    res.status(400).json({ error: 'name_ar is required and must be a non-empty string' });
    return;
  }
  if (!name_en || typeof name_en !== 'string' || name_en.trim() === '') {
    res.status(400).json({ error: 'name_en is required and must be a non-empty string' });
    return;
  }

  if (name_ar.length > MAX_NAME_LENGTH) {
    res.status(400).json({ error: `name_ar must be ${MAX_NAME_LENGTH} characters or less` });
    return;
  }
  if (name_en.length > MAX_NAME_LENGTH) {
    res.status(400).json({ error: `name_en must be ${MAX_NAME_LENGTH} characters or less` });
    return;
  }

  const result = db
    .prepare('INSERT INTO categories (name_ar, name_en, sort_order) VALUES (?, ?, ?)')
    .run(name_ar.trim(), name_en.trim(), sort_order ?? 0);

  const category = db
    .prepare('SELECT * FROM categories WHERE id = ?')
    .get(result.lastInsertRowid);

  res.status(201).json(category);
});

// PUT /api/categories/:id — update category (auth required)
router.put('/:id', requireAuth, (req: Request, res: Response) => {
  const id = paramId(req);
  const { name_ar, name_en, sort_order } = req.body;

  // Check category exists
  const existing = db
    .prepare('SELECT * FROM categories WHERE id = ?')
    .get(id);

  if (!existing) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  // Validate provided fields (only check if field is present)
  if (name_ar !== undefined && (typeof name_ar !== 'string' || name_ar.trim() === '')) {
    res.status(400).json({ error: 'name_ar must be a non-empty string' });
    return;
  }
  if (name_en !== undefined && (typeof name_en !== 'string' || name_en.trim() === '')) {
    res.status(400).json({ error: 'name_en must be a non-empty string' });
    return;
  }
  if (name_ar !== undefined && name_ar.length > MAX_NAME_LENGTH) {
    res.status(400).json({ error: `name_ar must be ${MAX_NAME_LENGTH} characters or less` });
    return;
  }
  if (name_en !== undefined && name_en.length > MAX_NAME_LENGTH) {
    res.status(400).json({ error: `name_en must be ${MAX_NAME_LENGTH} characters or less` });
    return;
  }

  // Build dynamic update
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (name_ar !== undefined) {
    updates.push('name_ar = ?');
    values.push(name_ar.trim());
  }
  if (name_en !== undefined) {
    updates.push('name_en = ?');
    values.push(name_en.trim());
  }
  if (sort_order !== undefined) {
    updates.push('sort_order = ?');
    values.push(sort_order);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const category = db
    .prepare('SELECT * FROM categories WHERE id = ?')
    .get(id);

  res.json(category);
});

// DELETE /api/categories/:id — delete category and cascade items (auth required)
router.delete('/:id', requireAuth, (req: Request, res: Response) => {
  const id = paramId(req);

  const existing = db
    .prepare('SELECT * FROM categories WHERE id = ?')
    .get(id);

  if (!existing) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  // CASCADE will delete related items
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);

  res.status(204).send();
});

export default router;
