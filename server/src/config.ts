import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const JWT_SECRET = process.env.JWT_SECRET || '';
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || '';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
export const PORT = process.env.PORT || '3001';
export const CORS_ORIGIN = process.env.CORS_ORIGIN;
