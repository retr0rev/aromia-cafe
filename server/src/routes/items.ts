import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import db from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// ── Constants ─────────────────────────────────────────────────────────
const UPLOADS_DIR = path.resolve(__dirname, '../../../uploads');

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const MAX_STRING_LENGTH = 500;
const MAX_TEXT_LENGTH = 2000;

// Magic bytes for image validation
const IMAGE_SIGNATURES: Record<string, Buffer[]> = {
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  'image/webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF header
};

// Map MIME to safe extension
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// ── Validation helpers ────────────────────────────────────────────────
function validateStringLength(value: unknown, maxLen: number, fieldName: string): string | null {
  if (typeof value !== 'string') return null;
  if (value.length > maxLen) return `${fieldName} must be ${maxLen} characters or less`;
  return null;
}

// ── Multer configuration ──────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, _file, cb) => {
    // UUID-only filename — no user-controlled extension
    // Extension will be set after magic byte validation
    const uuid = crypto.randomUUID();
    cb(null, uuid);
  },
});

function imageFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
  }
}

const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// ── Helper: wrap multer middleware to catch errors for Express 5 ─────
function handleUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  upload.single('image')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'File size must be under 5MB' });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next();
  });
}

// ── Helper: validate uploaded file magic bytes and rename ─────────────
function validateAndRenameUpload(file: Express.Multer.File): boolean {
  const filePath = file.path;

  // Read first 8 bytes for magic byte check
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(8);
  fs.readSync(fd, buffer, 0, 8, 0);
  fs.closeSync(fd);

  // Check magic bytes match declared MIME type
  const signatures = IMAGE_SIGNATURES[file.mimetype];
  if (!signatures) {
    fs.unlinkSync(filePath);
    return false;
  }

  const isValid = signatures.some((sig) => buffer.subarray(0, sig.length).equals(sig));
  if (!isValid) {
    fs.unlinkSync(filePath);
    return false;
  }

  // Rename file with proper extension based on validated MIME type
  const ext = MIME_TO_EXT[file.mimetype];
  const newPath = filePath + ext;
  fs.renameSync(filePath, newPath);

  // Update file object with new path and filename
  file.filename = file.filename + ext;
  file.path = newPath;

  return true;
}

// ── Helper: safe file unlink ────────────────────────────────────────
function deleteFileIfExists(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    console.error(`Failed to delete file: ${filePath}`);
  }
}

// ── GET /api/items — list items (public) ────────────────────────────
router.get('/', (_req: Request, res: Response) => {
  const categoryId = _req.query.category_id;

  let rows;
  if (categoryId) {
    const catId = Number(categoryId);
    if (Number.isNaN(catId)) {
      res.status(400).json({ error: 'Invalid category_id' });
      return;
    }
    rows = db
      .prepare('SELECT * FROM items WHERE category_id = ? ORDER BY sort_order ASC')
      .all(catId);
  } else {
    rows = db.prepare('SELECT * FROM items ORDER BY sort_order ASC').all();
  }

  res.json(rows);
});

// ── GET /api/items/:id — single item (public) ──────────────────────
router.get('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid item id' });
    return;
  }

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  res.json(item);
});

// ── POST /api/items — create item (auth required) ───────────────────
router.post(
  '/',
  authMiddleware,
  handleUpload,
  (req: Request, res: Response) => {
    const { name_ar, name_en, ingredients_ar, ingredients_en, price, category_id, sort_order, is_popular } =
      req.body;

    // Validate string lengths
    const lengthErrors = [
      validateStringLength(name_ar, MAX_STRING_LENGTH, 'name_ar'),
      validateStringLength(name_en, MAX_STRING_LENGTH, 'name_en'),
      validateStringLength(ingredients_ar, MAX_TEXT_LENGTH, 'ingredients_ar'),
      validateStringLength(ingredients_en, MAX_TEXT_LENGTH, 'ingredients_en'),
    ].filter(Boolean);

    if (lengthErrors.length > 0) {
      if (req.file) deleteFileIfExists(req.file.path);
      res.status(400).json({ error: lengthErrors.join(', ') });
      return;
    }

    // Validation — required fields
    const missing: string[] = [];
    if (!name_ar) missing.push('name_ar');
    if (!name_en) missing.push('name_en');
    if (!ingredients_ar) missing.push('ingredients_ar');
    if (!ingredients_en) missing.push('ingredients_en');
    if (price === undefined || price === null || price === '') missing.push('price');
    if (!category_id) missing.push('category_id');

    if (missing.length > 0) {
      if (req.file) deleteFileIfExists(req.file.path);
      res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
      return;
    }

    // Validate price is integer
    const priceInt = Number(price);
    if (Number.isNaN(priceInt) || !Number.isInteger(priceInt) || priceInt < 0) {
      if (req.file) deleteFileIfExists(req.file.path);
      res.status(400).json({ error: 'Price must be a non-negative integer' });
      return;
    }

    // Validate category exists
    const catId = Number(category_id);
    if (Number.isNaN(catId)) {
      if (req.file) deleteFileIfExists(req.file.path);
      res.status(400).json({ error: 'Invalid category_id' });
      return;
    }
    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(catId);
    if (!category) {
      if (req.file) deleteFileIfExists(req.file.path);
      res.status(400).json({ error: 'Category not found' });
      return;
    }

    // Validate file magic bytes and set proper extension
    if (req.file) {
      if (!validateAndRenameUpload(req.file)) {
        res.status(400).json({ error: 'Invalid image file content' });
        return;
      }
    }

    const image_path: string | null = req.file
      ? `/uploads/${req.file.filename}`
      : null;

    const sortOrder = sort_order !== undefined ? Number(sort_order) : 0;
    const isPopular = is_popular !== undefined ? (is_popular === 'true' || is_popular === '1' ? 1 : 0) : 0;

    const stmt = db.prepare(`
      INSERT INTO items (category_id, name_ar, name_en, ingredients_ar, ingredients_en, price, image_path, is_popular, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      const result = stmt.run(
        catId,
        name_ar,
        name_en,
        ingredients_ar,
        ingredients_en,
        priceInt,
        image_path,
        isPopular,
        sortOrder,
      );

      const newItem = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json(newItem);
    } catch (dbErr) {
      if (req.file) deleteFileIfExists(req.file.path);
      throw dbErr;
    }
  },
);

// ── PUT /api/items/:id — update item (auth required) ────────────────
router.put(
  '/:id',
  authMiddleware,
  handleUpload,
  (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      if (req.file) deleteFileIfExists(req.file.path);
      res.status(400).json({ error: 'Invalid item id' });
      return;
    }

    const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      if (req.file) deleteFileIfExists(req.file.path);
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const { name_ar, name_en, ingredients_ar, ingredients_en, price, category_id, sort_order, is_popular } =
      req.body;

    // Validate string lengths
    const lengthErrors = [
      validateStringLength(name_ar, MAX_STRING_LENGTH, 'name_ar'),
      validateStringLength(name_en, MAX_STRING_LENGTH, 'name_en'),
      validateStringLength(ingredients_ar, MAX_TEXT_LENGTH, 'ingredients_ar'),
      validateStringLength(ingredients_en, MAX_TEXT_LENGTH, 'ingredients_en'),
    ].filter(Boolean);

    if (lengthErrors.length > 0) {
      if (req.file) deleteFileIfExists(req.file.path);
      res.status(400).json({ error: lengthErrors.join(', ') });
      return;
    }

    // Validate category if provided
    if (category_id) {
      const catId = Number(category_id);
      if (Number.isNaN(catId)) {
        if (req.file) deleteFileIfExists(req.file.path);
        res.status(400).json({ error: 'Invalid category_id' });
        return;
      }
      const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(catId);
      if (!category) {
        if (req.file) deleteFileIfExists(req.file.path);
        res.status(400).json({ error: 'Category not found' });
        return;
      }
    }

    // Validate price if provided
    let priceInt: number | undefined;
    if (price !== undefined && price !== null && price !== '') {
      priceInt = Number(price);
      if (Number.isNaN(priceInt) || !Number.isInteger(priceInt) || priceInt < 0) {
        if (req.file) deleteFileIfExists(req.file.path);
        res.status(400).json({ error: 'Price must be a non-negative integer' });
        return;
      }
    }

    // Validate file magic bytes and set proper extension
    if (req.file) {
      if (!validateAndRenameUpload(req.file)) {
        res.status(400).json({ error: 'Invalid image file content' });
        return;
      }
    }

    let imagePath: string | null = (existing.image_path as string | null) ?? null;
    let oldImagePath: string | null = null;

    if (req.file) {
      if (imagePath) {
        oldImagePath = path.join(UPLOADS_DIR, path.basename(imagePath));
      }
      imagePath = `/uploads/${req.file.filename}`;
    }

    // Build dynamic SET clause — only update provided fields
    const updates: string[] = [];
    const values: unknown[] = [];

    if (name_ar !== undefined) { updates.push('name_ar = ?'); values.push(name_ar); }
    if (name_en !== undefined) { updates.push('name_en = ?'); values.push(name_en); }
    if (ingredients_ar !== undefined) { updates.push('ingredients_ar = ?'); values.push(ingredients_ar); }
    if (ingredients_en !== undefined) { updates.push('ingredients_en = ?'); values.push(ingredients_en); }
    if (priceInt !== undefined) { updates.push('price = ?'); values.push(priceInt); }
    if (category_id !== undefined) { updates.push('category_id = ?'); values.push(Number(category_id)); }
    if (req.file) { updates.push('image_path = ?'); values.push(imagePath); }
    if (is_popular !== undefined) {
      updates.push('is_popular = ?');
      values.push(is_popular === 'true' || is_popular === '1' ? 1 : 0);
    }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(Number(sort_order)); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    try {
      db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    } catch (dbErr) {
      if (req.file) deleteFileIfExists(req.file.path);
      throw dbErr;
    }

    if (oldImagePath) deleteFileIfExists(oldImagePath);

    const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    res.json(updated);
  },
);

// ── DELETE /api/items/:id — delete item (auth required) ─────────────
router.delete('/:id', authMiddleware, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid item id' });
    return;
  }

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  db.prepare('DELETE FROM items WHERE id = ?').run(id);

  if (item.image_path) {
    const filePath = path.join(UPLOADS_DIR, path.basename(item.image_path as string));
    deleteFileIfExists(filePath);
  }

  res.json({ message: 'Item deleted' });
});

export default router;
