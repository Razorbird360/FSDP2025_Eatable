# 🍜 Eatable - Community-Driven Hawker Centre eMenu

## Setup

### 1. Install dependencies
```bash
pnpm install
```

### 2. Set up environment variables

Create `.env` files:
```bash
cp apps/client/.env.example apps/client/.env
cp apps/server/.env.example apps/server/.env
```

Update `apps/server/.env` with your Supabase credentials:
- Get `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` from your Supabase project dashboard
- Get `DATABASE_URL` from Supabase Settings → Database → Connection String

### 3. Generate Prisma client
```bash
pnpm prisma:generate
```

### 4. Run database migrations
```bash
pnpm prisma:migrate
```
**What this does:** Creates database tables based on your Prisma schema

### 5. Seed database with sample data
```bash
pnpm prisma:seed
```
**What this does:** Adds sample stalls, menu items, and users to your database

### 6. Start development servers
```bash
pnpm dev
```
- Client: http://localhost:5173
- Server: http://localhost:3000

## Quick Setup (All-in-one)

**Note:** Scripts are for Windows. Mac/Linux users should run the commands manually above.

```bash
scripts\setup.bat  # Installs deps + creates .env files + generates Prisma
scripts\seed.bat   # Runs migrations + seeds database
pnpm dev           # Starts both client and server
```
