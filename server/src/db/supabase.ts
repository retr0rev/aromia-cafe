import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Helper to run raw SQL queries
export async function query(sql: string, params: unknown[] = []) {
  const { data, error } = await supabase.rpc('exec_sql', { sql, params })
  if (error) throw error
  return data
}

// Helper for single row queries
export async function queryOne(sql: string, params: unknown[] = []) {
  const data = await query(sql, params)
  return data?.[0] ?? null
}

// Helper for insert/update/delete that returns affected rows
export async function execute(sql: string, params: unknown[] = []) {
  const { data, error } = await supabase.rpc('exec_sql', { sql, params })
  if (error) throw error
  return data
}
