import bcrypt from 'bcryptjs';
import db from './index';
import { ADMIN_USERNAME, ADMIN_PASSWORD } from '../config';

const SALT_ROUNDS = 10;

const DEFAULT_SETTINGS_KEYS = [
  'about_ar',
  'about_en',
  'address',
  'phone',
  'hours',
  'instagram',
  'facebook',
  'tagline_ar',
  'tagline_en',
];

export function seed(): void {
  const existing = db.prepare('SELECT id FROM admin WHERE username = ?').get(ADMIN_USERNAME);
  if (!existing) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, SALT_ROUNDS);
    db.prepare('INSERT INTO admin (username, password_hash) VALUES (?, ?)').run(
      ADMIN_USERNAME,
      hash,
    );
    console.log('Admin user created');
  }

  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
  );
  for (const key of DEFAULT_SETTINGS_KEYS) {
    insertSetting.run(key, '');
  }

  console.log('Database seeded');
}

seed();
