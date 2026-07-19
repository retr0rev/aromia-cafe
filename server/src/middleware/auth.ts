import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWT_SECRET is validated at startup in index.ts — this will always be defined
const JWT_SECRET = process.env.JWT_SECRET!;

export interface JwtPayload {
  id: number;
  username: string;
}

// Extend Express Request to include admin info
declare global {
  namespace Express {
    interface Request {
      admin?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'], // Explicit algorithm — prevents alg confusion attacks
    }) as JwtPayload;
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export { authMiddleware as requireAuth };

export { JWT_SECRET };
