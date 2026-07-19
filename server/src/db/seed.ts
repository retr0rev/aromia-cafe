import bcrypt from 'bcryptjs';
import db from './index';

const SALT_ROUNDS = 10;

// These are validated at startup in index.ts — they will always be defined
const ADMIN_USERNAME = process.env.ADMIN_USERNAME!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;

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
  // Create default admin user if not exists
  const existing = db.prepare('SELECT id FROM admin WHERE username = ?').get(ADMIN_USERNAME);
  if (!existing) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, SALT_ROUNDS);
    db.prepare('INSERT INTO admin (username, password_hash) VALUES (?, ?)').run(
      ADMIN_USERNAME,
      hash,
    );
    console.log('Admin user created');
  }

  // Insert default settings keys with empty values (ignore if already exists)
  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
  );
  for (const key of DEFAULT_SETTINGS_KEYS) {
    insertSetting.run(key, '');
  }

  console.log('Database seeded');
}

// Run seed on import
seed();
