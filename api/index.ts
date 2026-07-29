import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { initDatabase } from '../server/src/db/postgres'

// Import routes
import authRoutes from '../server/src/routes/auth-pg'
import categoryRoutes from '../server/src/routes/categories-pg'
import itemRoutes from '../server/src/routes/items-pg'
import popularRoutes from '../server/src/routes/popular-pg'
import settingsRoutes from '../server/src/routes/settings-pg'

const app = express()

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}))

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

// Routes - no /api prefix since Vercel strips it
app.use('/auth', authRoutes)
app.use('/categories', categoryRoutes)
app.use('/items', itemRoutes)
app.use('/popular', popularRoutes)
app.use('/settings', settingsRoutes)

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err.stack ?? err.message)
  res.status(500).json({ error: 'Internal server error' })
})

// Initialize database on cold start
let dbInitialized = false

async function ensureDb() {
  if (!dbInitialized) {
    await initDatabase()
    dbInitialized = true
  }
}

// Vercel serverless function handler
export default async function handler(req: Request, res: Response) {
  await ensureDb()
  return app(req, res)
}
