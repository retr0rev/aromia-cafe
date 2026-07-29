# Aromia Cafe Menu

A beautiful, bilingual (Arabic/English) cafe menu website with admin dashboard.

## Features

- 🎨 Beautiful 3D hero section with Three.js
- 📱 Fully responsive design
- 🌍 Bilingual support (Arabic/English)
- 📝 Admin dashboard for managing menu items
- 🔐 JWT authentication
- 🖼️ Image upload support
- ⚡ Fast, modern stack (React, Vite, Tailwind CSS)

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS 4, TanStack Router, TanStack Query
- **Backend:** Express.js (Vercel Serverless Functions)
- **Database:** Supabase (PostgreSQL)
- **Deployment:** Vercel

## Deployment to Vercel + Supabase

### 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → Database to get your connection string
3. Go to Settings → API to get your service role key

### 2. Configure Environment Variables

In your Vercel project settings, add these environment variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
JWT_SECRET=your-super-secret-jwt-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
CORS_ORIGIN=https://your-domain.vercel.app
```

### 3. Deploy

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Build the client
npm run build

# Deploy to Vercel
vercel
```

### 4. Seed the Database

After deployment, run the seed script to create the admin account:

```bash
# Set DATABASE_URL environment variable locally
export DATABASE_URL="your-supabase-connection-string"

# Run seed script
npm run seed:pg
```

## Local Development

### With SQLite (default)

```bash
# Install dependencies
npm run install:all

# Start development servers
npm run dev
```

The client will be available at `http://localhost:5173` and the server at `http://localhost:3001`.

### With Supabase (PostgreSQL)

1. Create a `.env` file with your Supabase credentials
2. Run the seed script: `npm run seed:pg`
3. Start the development server: `npm run dev`

## Project Structure

```
aromia-menu/
├── api/                    # Vercel serverless functions
│   └── index.ts           # Main API entry point
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── routes/        # TanStack Router routes
│   │   └── ...
│   └── package.json
├── server/                 # Express backend (for local dev)
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth middleware
│   │   └── db/           # Database layer
│   └── package.json
├── scripts/               # Utility scripts
│   └── seed-pg.ts        # Database seed script
├── vercel.json            # Vercel configuration
└── package.json           # Root package.json
```

## Admin Dashboard

Access the admin dashboard at `/admin/login` with the credentials you set in the environment variables.

From the dashboard you can:
- Manage menu categories
- Add/edit/delete menu items
- Upload item images
- Set popular items
- Update cafe information
- Change admin password

## License

Private - All rights reserved
