import { JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD, PORT, CORS_ORIGIN } from './config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';

if (!JWT_SECRET) {
  console.error('[FATAL] Missing required environment variable: JWT_SECRET');
  process.exit(1);
}
if (!ADMIN_USERNAME) {
  console.error('[FATAL] Missing required environment variable: ADMIN_USERNAME');
  process.exit(1);
}
if (!ADMIN_PASSWORD) {
  console.error('[FATAL] Missing required environment variable: ADMIN_PASSWORD');
  process.exit(1);
}

import './db/seed';

import authRoutes from './routes/auth';
import categoryRoutes from './routes/categories';
import itemRoutes from './routes/items';
import popularRoutes from './routes/popular';
import settingsRoutes from './routes/settings';

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? (CORS_ORIGIN || false)
      : 'http://localhost:5173',
    credentials: true,
  }),
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../../uploads'), {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/popular', popularRoutes);
app.use('/api/settings', settingsRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err.stack ?? err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Aromia server running on port ${PORT}`);
});

export default app;
