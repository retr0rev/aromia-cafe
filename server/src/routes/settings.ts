import { Router, Request, Response } from 'express';
import db from '../db/index';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Allowed settings keys — prevents arbitrary key injection
const ALLOWED_KEYS = new Set([
  'about_ar',
  'about_en',
  'address',
  'phone',
  'hours',
  'instagram',
  'facebook',
  'tagline_ar',
  'tagline_en',
]);

const MAX_VALUE_LENGTH = 2000;

// Keys that must be valid URLs (if non-empty)
const URL_KEYS = new Set(['instagram', 'facebook']);

function isValidUrl(value: string): boolean {
  if (value === '') return true; // Empty is allowed
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// GET /api/settings — return all settings as key-value object (public)
router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string;
    value: string;
  }[];

  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  res.json(settings);
});

// PUT /api/settings — upsert settings (auth required)
router.put('/', requireAuth, (req: Request, res: Response) => {
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: 'Request body must be a JSON object' });
    return;
  }

  const entries = Object.entries(body);
  if (entries.length === 0) {
    res.status(400).json({ error: 'No settings provided' });
    return;
  }

  // Validate all keys are allowed
  for (const [key] of entries) {
    if (!ALLOWED_KEYS.has(key)) {
      res.status(400).json({ error: `Invalid settings key: ${key}` });
      return;
    }
  }

  // Validate value lengths and URL format
  for (const [key, value] of entries) {
    const strValue = String(value);

    if (strValue.length > MAX_VALUE_LENGTH) {
      res.status(400).json({ error: `Value for '${key}' must be ${MAX_VALUE_LENGTH} characters or less` });
      return;
    }

    if (URL_KEYS.has(key) && !isValidUrl(strValue)) {
      res.status(400).json({ error: `Value for '${key}' must be a valid http:// or https:// URL` });
      return;
    }
  }

  const upsert = db.prepare(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
  );

  const upsertMany = db.transaction((items: [string, string][]) => {
    for (const [key, value] of items) {
      upsert.run(key, String(value));
    }
  });

  upsertMany(entries as [string, string][]);

  // Return updated settings
  const rows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string;
    value: string;
  }[];

  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  res.json(settings);
});

export default router;
