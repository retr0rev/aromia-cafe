import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
})

async function seed() {
  console.log('Connecting to database...')
  const client = await pool.connect()

  try {
    console.log('Creating tables...')
    await client.query(`
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
    console.log('Tables created.')

    const adminUsername = process.env.ADMIN_USERNAME || 'admin'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456'

    console.log(`Creating admin user: ${adminUsername}...`)
    const existingAdmin = await client.query('SELECT id FROM admin WHERE username = $1', [adminUsername])
    if (existingAdmin.rows.length === 0) {
      const hash = bcrypt.hashSync(adminPassword, 10)
      await client.query('INSERT INTO admin (username, password_hash) VALUES ($1, $2)', [adminUsername, hash])
      console.log('Admin user created.')
    } else {
      console.log('Admin user already exists.')
    }

    console.log('Inserting default settings...')
    const defaultSettings = {
      about_ar: '',
      about_en: '',
      tagline_ar: '',
      tagline_en: '',
      address: '',
      phone: '',
      hours: '',
      instagram: '',
      facebook: '',
    }

    for (const [key, value] of Object.entries(defaultSettings)) {
      await client.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
        [key, value]
      )
    }

    console.log('Database seeded successfully!')
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err.message)
    process.exit(1)
  })
