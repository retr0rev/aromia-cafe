// Load environment variables FIRST — before any other imports
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';

// Validate required environment variables at startup
const requiredEnvVars = ['JWT_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`[FATAL] Missing required environment variable: ${envVar}`);
    console.error('Create a .env file based on .env.example and restart.');
    process.exit(1);
  }
}

// DB init must run before route imports (after dotenv is loaded)
import './db/seed';

import authRoutes from './routes/auth';
import categoryRoutes from './routes/categories';
import itemRoutes from './routes/items';
import popularRoutes from './routes/popular';
import settingsRoutes from './routes/settings';

const app = express();
const PORT = process.env.PORT ?? 3001;

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      scriptSrc: ["'self'", "'unsafe-inline'"], // React needs unsafe-inline for hydration
      styleSrc: ["'self'", "'unsafe-inline'"],   // Tailwind needs unsafe-inline
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow images from /uploads
}));

// CORS — allow Vite dev server
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? (process.env.CORS_ORIGIN || false)
      : 'http://localhost:5173',
    credentials: true,
  }),
);

// Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsers (1mb for regular requests, larger for file uploads handled by multer)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Static file serving for uploaded images (with security headers)
app.use('/uploads', express.static(path.join(__dirname, '../../uploads'), {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/popular', popularRoutes);
app.use('/api/settings', settingsRoutes);

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err.stack ?? err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Aromia server running on port ${PORT}`);
});

export default app;
