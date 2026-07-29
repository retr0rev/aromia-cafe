import { Pool, QueryResult } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

// Execute a query and return rows
export async function query(text: string, params: unknown[] = []): Promise<unknown[]> {
  const result: QueryResult = await pool.query(text, params)
  return result.rows
}

// Execute a query and return the first row
export async function queryOne(text: string, params: unknown[] = []): Promise<unknown | null> {
  const rows = await query(text, params)
  return rows[0] ?? null
}

// Execute an insert/update/delete and return the result
export async function execute(text: string, params: unknown[] = []): Promise<QueryResult> {
  return pool.query(text, params)
}

// Initialize the database schema
export async function initDatabase(): Promise<void> {
  await pool.query(`
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
}

export default pool
