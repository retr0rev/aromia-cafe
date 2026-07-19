# Aromia Cafe Menu

A digital cafe menu application with a React frontend and Express backend.

## Features

- **Customer Menu**: Beautiful, mobile-first menu with categories, items, and popular items
- **Admin Dashboard**: Full CRUD for categories, items, popular items, and settings
- **Bilingual**: Arabic and English support
- **3D Hero Section**: Interactive 3D logo with coffee bean particles
- **Image Upload**: Secure file upload with magic byte validation
- **JWT Authentication**: Secure admin authentication with rate limiting

## Tech Stack

- **Frontend**: React, TanStack Router, Tailwind CSS, Three.js
- **Backend**: Express, SQLite (better-sqlite3), JWT, bcrypt
- **Security**: Helmet, express-rate-limit, CORS, input validation

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/aromia-cafe.git
   cd aromia-cafe
   ```

2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your values:
   ```env
   JWT_SECRET=your-super-secret-jwt-key-here
   ADMIN_USERNAME=your-admin-username
   ADMIN_PASSWORD=your-strong-password
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

6. Open in browser:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Admin Dashboard: http://localhost:5173/admin

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret key for JWT token signing |
| `ADMIN_USERNAME` | Yes | Admin account username |
| `ADMIN_PASSWORD` | Yes | Admin account password (min 8 chars) |
| `PORT` | No | Server port (default: 3001) |
| `CORS_ORIGIN` | No | CORS origin for production |

## API Endpoints

### Public
- `GET /api/categories` - List all categories
- `GET /api/items` - List all items
- `GET /api/popular` - List popular items
- `GET /api/settings` - Get cafe settings

### Admin (requires JWT)
- `POST /api/auth/login` - Login
- `PUT /api/auth/username` - Change username
- `PUT /api/auth/password` - Change password
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category
- `POST /api/items` - Create item (with image upload)
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item
- `PUT /api/popular` - Set popular items
- `PUT /api/settings` - Update settings

## Security Features

- JWT authentication with explicit algorithm (HS256)
- Rate limiting on login endpoint (10 attempts per 15 minutes)
- Security headers via Helmet
- File upload with magic byte validation
- Input length limits on all text fields
- Settings key whitelist
- URL validation for social media links
- No hardcoded secrets (requires environment variables)

## License

Private - Aromia Cafe
