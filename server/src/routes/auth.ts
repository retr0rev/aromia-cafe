import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db';
import { authMiddleware, JWT_SECRET } from '../middleware/auth';

const router = Router();

interface AdminRow {
  id: number;
  username: string;
  password_hash: string;
}

// POST /api/auth/login — validate credentials and return JWT
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username) as AdminRow | undefined;

  if (!admin) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = bcrypt.compareSync(password, admin.password_hash);

  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, {
    expiresIn: '24h',
  });

  res.json({
    token,
    admin: { id: admin.id, username: admin.username },
  });
});

// GET /api/auth/verify — return admin info for valid token
router.get('/verify', authMiddleware, (req: Request, res: Response) => {
  res.json({ admin: req.admin });
});

export default router;
