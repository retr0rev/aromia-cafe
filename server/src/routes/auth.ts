import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db';
import { authMiddleware, JWT_SECRET } from '../middleware/auth';

const router = Router();

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const MAX_USERNAME_LENGTH = 50;

interface AdminRow {
  id: number;
  username: string;
  password_hash: string;
}

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
    return;
  }

  const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username) as AdminRow | undefined;

  if (!admin) {
    res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    return;
  }

  const valid = bcrypt.compareSync(password, admin.password_hash);

  if (!valid) {
    res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
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

router.get('/verify', authMiddleware, (req: Request, res: Response) => {
  res.json({ admin: req.admin });
});

router.put('/username', authMiddleware, (req: Request, res: Response) => {
  const { newUsername, password } = req.body;

  if (!newUsername || !password) {
    res.status(400).json({ error: 'اسم المستخدم الجديد وكلمة المرور مطلوبان' });
    return;
  }

  if (typeof newUsername !== 'string' || newUsername.trim().length < 3) {
    res.status(400).json({ error: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' });
    return;
  }

  if (newUsername.length > MAX_USERNAME_LENGTH) {
    res.status(400).json({ error: `اسم المستخدم يجب أن يكون ${MAX_USERNAME_LENGTH} حرفًا أو أقل` });
    return;
  }

  const admin = db.prepare('SELECT * FROM admin WHERE id = ?').get(req.admin!.id) as AdminRow;

  if (!bcrypt.compareSync(password, admin.password_hash)) {
    res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    return;
  }

  const existing = db.prepare('SELECT id FROM admin WHERE username = ? AND id != ?').get(newUsername.trim(), req.admin!.id);
  if (existing) {
    res.status(409).json({ error: 'اسم المستخدم مستخدم بالفعل' });
    return;
  }

  db.prepare('UPDATE admin SET username = ? WHERE id = ?').run(newUsername.trim(), req.admin!.id);

  const token = jwt.sign({ id: admin.id, username: newUsername.trim() }, JWT_SECRET, {
    expiresIn: '24h',
  });

  res.json({
    message: 'تم تغيير اسم المستخدم بنجاح',
    token,
    admin: { id: admin.id, username: newUsername.trim() },
  });
});

router.put('/password', authMiddleware, (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'كلمة المرور الحالية والجديدة مطلوبتان' });
    return;
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({ error: `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل` });
    return;
  }

  const admin = db.prepare('SELECT * FROM admin WHERE id = ?').get(req.admin!.id) as AdminRow;

  if (!bcrypt.compareSync(currentPassword, admin.password_hash)) {
    res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    return;
  }

  const hash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
  db.prepare('UPDATE admin SET password_hash = ? WHERE id = ?').run(hash, req.admin!.id);

  res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
});

export default router;
