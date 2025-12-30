# 🍜 Eatable - Community-Driven Hawker Centre eMenu

A modern, community-driven platform for hawker centre eMenus with AI-powered food validation.

## Architecture

This is a **pnpm monorepo** with three main services:

- **Client** (`apps/client`) - React + Vite frontend (Port 5173)
- **Server** (`apps/server`) - Express.js backend API (Port 3000)
- **AI Service** (`apps/ai-services`) - Python/FastAPI AI validation service (Port 8000)

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.0.0 or higher
- **pnpm** 8.0.0 or higher
- **Python** 3.13 or higher (for AI service)
- **Supabase** account (for database and auth)
- **Google Gemini API** key (for AI food validation)

### Installing Prerequisites

**pnpm:**
```bash
npm install -g pnpm
```

**Python (Windows):**
Download from [python.org/downloads](https://www.python.org/downloads/) and ensure "Add to PATH" is checked.

**Python (Mac):**
```bash
brew install python@3.13
```

**Python (Linux):**
```bash
sudo apt update
sudo apt install python3.13 python3.13-venv python3-pip
```

---

## Quick Setup (Windows)

For Windows users, we provide automated setup scripts:

```bash
# 1. Run main setup (Node.js dependencies + Prisma + AI service)
scripts\setup.bat

# 2. Update environment variables
#    - apps/client/.env - Add Supabase anon key
#    - apps/server/.env - Add Supabase service key and database URL
#    - apps/ai-services/.env - Add GEMINI_API_KEY

# 3. Run database migrations and seed
scripts\seed.bat

# 4. Start development servers
pnpm dev              # Client + Server (Terminal 1)
pnpm dev:ai           # AI service (Terminal 2)
```

---

## Manual Setup (All Platforms)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Create `.env` files for each service:

```bash
# Unix/Mac
cp apps/client/.env.example apps/client/.env
cp apps/server/.env.example apps/server/.env
cp apps/ai-services/.env.example apps/ai-services/.env

# Windows
copy apps\client\.env.example apps\client\.env
copy apps\server\.env.example apps\server\.env
copy apps\ai-services\.env.example apps\ai-services\.env
```

**Configure each `.env` file:**

**`apps/client/.env`:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_BASE_URL=http://localhost:3000/api
```

**`apps/server/.env`:**
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here
AI_SERVICE_URL=http://localhost:8000
```

**`apps/ai-services/.env`:**
```env
GEMINI_API_KEY=your-gemini-api-key-here
```

**Getting API Keys:**
- **Supabase:** [supabase.com](https://supabase.com) → Project Settings → API
- **Gemini API:** [ai.google.dev](https://ai.google.dev/) → Get API Key

### 3. Set Up AI Service

**Windows:**
```bash
scripts\setup-ai.bat
```

**Unix/Mac:**
```bash
bash scripts/setup-ai.sh
```

This script will:
- Create a Python virtual environment
- Install all required dependencies
- Copy `.env.example` to `.env`

### 4. Set Up Database

Generate Prisma client:
```bash
pnpm prisma:generate
```

Run migrations:
```bash
pnpm prisma:migrate
```

Seed database with sample data:
```bash
pnpm prisma:seed
```

---

## Running the Application

### Development Mode

**Start Client + Server:**
```bash
pnpm dev
```
- Client: http://localhost:5173
- Server: http://localhost:3000

**Start AI Service (in separate terminal):**
```bash
pnpm dev:ai
```
- AI Service: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Start All Services Together (alternative):**
```bash
pnpm dev:all
```

### Individual Services

```bash
pnpm dev:client    # Only frontend
pnpm dev:server    # Only backend
pnpm dev:ai        # Only AI service
```

---

## Service Dependencies

**Photo Upload Feature Requires:**
- Server running (Port 3000)
- AI Service running (Port 8000)

The AI service validates uploaded photos to ensure they contain food and match the selected menu item.

---

## Available Scripts

### Development
- `pnpm dev` - Run client + server in parallel
- `pnpm dev:client` - Run only frontend
- `pnpm dev:server` - Run only backend
- `pnpm dev:ai` - Run only AI service
- `pnpm dev:all` - Run all services together

### Build
- `pnpm build` - Build all services
- `pnpm build:client` - Build frontend
- `pnpm build:server` - Build backend

### Database
- `pnpm prisma:generate` - Generate Prisma client
- `pnpm prisma:migrate` - Run database migrations
- `pnpm prisma:studio` - Open Prisma Studio GUI
- `pnpm prisma:seed` - Seed database

### AI Service
- `pnpm setup:ai` - Run AI service setup
- `pnpm dev:ai` - Start AI service

---

## Troubleshooting

### AI Service Issues

**Problem: "Python is not installed"**
- **Windows:** Download from [python.org](https://www.python.org/downloads/)
- **Mac:** Run `brew install python@3.13`
- **Linux:** Run `sudo apt install python3.13 python3.13-venv`

**Problem: "Virtual environment not found"**
```bash
# Windows
scripts\setup-ai.bat

# Unix/Mac
bash scripts/setup-ai.sh
```

**Problem: "Gemini AI service is not configured"**
- Ensure `GEMINI_API_KEY` is set in `apps/ai-services/.env`
- Get key from [ai.google.dev](https://ai.google.dev/)
- Restart AI service after adding key

**Problem: "Module not found" errors**
```bash
cd apps/ai-services

# Windows
venv\Scripts\activate.bat
pip install -r requirements.txt

# Unix/Mac
source venv/bin/activate
pip install -r requirements.txt
```

**Problem: "Port 8000 already in use"**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# Unix/Mac
lsof -ti:8000 | xargs kill -9
```

### Database Issues

**Problem: "Prisma Client not generated"**
```bash
pnpm prisma:generate
```

**Problem: "Cannot connect to database"**
- Check `DATABASE_URL` in `apps/server/.env`
- Ensure Supabase database is accessible
- Verify connection string format

### Port Conflicts

**Default Ports:**
- Client: 5173 (Vite)
- Server: 3000 (Express)
- AI Service: 8000 (FastAPI)

If ports are in use, update the respective `.env` files or stop conflicting services.

---

## Project Structure

```
.
├── apps/
│   ├── client/          # React frontend (Vite)
│   ├── server/          # Express.js backend
│   └── ai-services/     # FastAPI AI service
├── scripts/
│   ├── setup.bat        # Windows main setup
│   ├── setup-ai.bat     # Windows AI setup
│   ├── setup-ai.sh      # Unix/Mac AI setup
│   ├── seed.bat         # Database seeding
│   ├── dev-ai.js        # AI service runner
│   ├── setup-ai-check.js # Cross-platform AI setup
│   └── test-ai-setup.js # AI setup validation
├── package.json         # Root workspace config
├── pnpm-workspace.yaml  # Workspace definition
└── README.md           # This file
```

---

## Tech Stack

**Frontend:**
- React 18
- Vite
- Chakra UI
- React Router
- Axios

**Backend:**
- Express.js
- Prisma ORM
- Supabase (PostgreSQL + Auth)
- Multer (File uploads)
- Sharp (Image processing)

**AI Service:**
- FastAPI
- Python 3.13
- Google Gemini AI (gemini-2.5-flash)
- Pillow (Image processing)
- OpenCV

---

## Contributing

See individual service READMEs for development guidelines:
- [AI Service Documentation](./apps/ai-services/README.md)

For database management, see [PRISMA_WORKFLOW.md](./PRISMA_WORKFLOW.md)

---

## License

MIT License - See LICENSE file for details
