
# Eatable
<p align="center">
  <img src="apps/client/src/assets/logo/Logo_full_light.png" alt="Eatable" width="360" />
</p>

Community-driven hawker centre menus, ordering, and verification.

This repository is a pnpm monorepo that powers:
- A customer web app (browse stalls, community photos, order + pay).
- A hawker flow (ID + face verification, stall setup, dashboard + dish management).
- An in-app AI agent (tool-calling chat for discovery/cart/order/payment).
- Optional monitoring (Prometheus + Grafana).

## Resource Links
Slides [here](https://www.canva.com/design/DAG_beRPosw/8pGANjsHFhpi2mS7DSvfWA/edit?utm_content=DAG_beRPosw&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton)  
Figma [here](https://www.figma.com/design/lQLWWhkWKBYVUHGMq7gY3a/Eatable-BevEats?node-id=1-2&t=CtAhC8Ikp7CBtmlS-1)  
Live website at [eatable.blog](https://eatable.blog)

## Scope (What This Project Covers)

Customer experience
- Browse hawker centres and stalls, view menus and community photos.
- Cart and checkout with NETS QR payment flow.
- Favourites and voting on community uploads.
- AI agent chat for discovery, cart actions, checkout and help.

Hawker experience
- Identity verification (ID + face validation).
- Stall setup and profile management.
- Hawker dashboard (orders, dishes, basic analytics).

AI components
- Food photo validation/tagging (AI service).
- Hawker identity validation (AI service).
- General AI agent with tool execution (server-side LangChain + Gemini).

Observability
- Prometheus metrics exposed by the server and AI service.
- Grafana dashboards provisioned via docker-compose.

## Architecture

Services (ports are the defaults for local dev):
- `apps/client` (React + Vite) - http://localhost:5173
- `apps/server` (Express API) - http://localhost:3000
- `apps/ai-services` (FastAPI) - http://localhost:8000
- `monitoring` (Prometheus + Grafana, optional) - http://localhost:9090 + http://localhost:3001

Data and integrations
- Database: PostgreSQL (local Docker by default, via `docker-compose.yml`).
- Auth + Storage: Supabase (Auth + Storage buckets).
- AI models:
  - Gemini (server agent + AI service validation, configured via env).
  - CV models used in the AI service for verification flows.

## Key URLs (Local Dev)

- Client: http://localhost:5173
- Server health: http://localhost:3000/api/health
- Server metrics: http://localhost:3000/metrics
- AI service docs: http://localhost:8000/docs
- Grafana (optional): http://localhost:3001 (default dev login: `admin` / `admin`)
- Prometheus (optional): http://localhost:9090

## Monitoring (Prometheus + Grafana)

The server and AI service export Prometheus metrics at `/metrics`. The monitoring stack is shipped in
`monitoring/` and is designed for local development.

Start metrics stack:
```bash
pnpm dev:metrics
```

Stop metrics stack:
```bash
docker compose -f monitoring/docker-compose.yml down
```

Notes
- Grafana is pre-provisioned with a Prometheus datasource and dashboards from
  `monitoring/grafana/provisioning/`.
- Default Grafana credentials are development-only and can be changed in
  `monitoring/docker-compose.yml`.

## Storage Buckets (Supabase)

These buckets are expected for common flows:
- `food-images` - community dish uploads / menu-related media.
- `stall-images` - stall profile images.
- `profile-pictures` - user profile pictures.

Uploads are compressed server-side (Sharp). Image uploads are capped at ~2MB after compression
(see `MAX_IMAGE_BYTES` in `apps/server/src/services/storage.service.js`).

## Scripts and Commands

Run from repository root unless noted.

Development
- `pnpm dev` - runs client + server (workspace dev scripts).
- `pnpm dev:client` - runs the Vite client only.
- `pnpm dev:server` - runs the Express server only.
- `pnpm dev:ai` - runs the FastAPI AI service (separate process).
- `pnpm dev:all` - runs client + server + AI service concurrently.
- `pnpm dev:metrics` - starts Prometheus + Grafana via Docker.

Docker (Full Stack)
- `pnpm docker:up` - start existing containers (no build).
- `pnpm docker:full` - build + start the full stack.
- `pnpm docker:rebuild` - force rebuild + start the full stack.
- `pnpm docker:down` - stop the full stack.
- `pnpm docker:down:volumes` - stop + wipe DB volume.
- `pnpm docker:restart:all` - restart client/server/ai/cloudflared.
- `pnpm docker:restart:client` - restart client only.
- `pnpm docker:restart:server` - restart server only.
- `pnpm docker:restart:ai` - restart AI service only.
- `pnpm docker:restart:cloudflared` - restart cloudflared only.
- `pnpm docker:logs:server` - follow server logs.
- `pnpm docker:logs:ai` - follow AI logs.
- `pnpm docker:logs:client` - follow client logs.
- `pnpm docker:logs:cloudflared` - follow cloudflared logs.
- `pnpm docker:status` - show container status.
- `pnpm docker:migrate` - apply Prisma migrations (use carefully if pointing at Supabase).

Build
- `pnpm build` - builds all workspace packages.
- `pnpm build:client` - builds the client.
- `pnpm build:server` - builds the server.

Database (server)
- `pnpm prisma:generate` - generates Prisma client.
- `pnpm prisma:migrate` - runs Prisma migrations.
- `pnpm prisma:seed` - seeds local DB with sample data.
- `pnpm prisma:studio` - opens Prisma Studio.

Formatting and lint
- `pnpm format` - Prettier for JS/JSX/JSON/MD.
- `pnpm lint` - client + server lint.

Agent smoke check (optional)
```bash
AGENT_SMOKE_TOKEN=your-access-token \
AGENT_SMOKE_URL=http://localhost:3000/api/agent \
pnpm --filter server agent:smoke
```

## Tech Stack

Frontend
- React, Vite, Chakra UI, React Router, Axios

Backend
- Express, Prisma, Supabase (Auth/Storage), Sharp, Multer

AI service
- FastAPI (Python), Gemini integration, OpenCV/Pillow for image processing

Monitoring (optional)
- Prometheus, Grafana, prom-client

## Repository Structure

```
.
├── apps/
│   ├── client/                 # React frontend (Vite)
│   ├── server/                 # Express API (Prisma)
│   └── ai-services/            # FastAPI AI service (Python)
├── monitoring/                 # Prometheus + Grafana (docker-compose)
├── docker/                     # Local postgres volume directory
├── scripts/                    # Windows + cross-platform helpers
│   └── lib/                    # Node scripts (AI service runners/checks)
├── docker-compose.yml          # Local Postgres
└── README.md
```

## Setup (Bottom-of-README Quickstart)

Prerequisites
- Node.js >= 18
- pnpm >= 8
- Python >= 3.13 (for `apps/ai-services`)
- Docker Desktop (local DB + monitoring)
- Supabase project (Auth + Storage)
- Gemini API key(s) (AI service + agent)

1) Install dependencies
```bash
pnpm install
```

2) Start the local Postgres database
```bash
docker compose up -d
```

Windows users can also use:
```bat
scripts\start-local-db.bat
```

3) Set up environment files
```bash
cp apps/client/.env.example apps/client/.env
cp apps/server/.env.example apps/server/.env
cp apps/ai-services/.env.example apps/ai-services/.env
```

Required env (minimum)
- `apps/client/.env`: Supabase URL + anon key (and API base URL if non-default)
- `apps/server/.env`: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `AI_SERVICE_URL`, `GEMINI_API_KEY`
- `apps/ai-services/.env`: `GEMINI_API_KEY`

4) Prisma generate + migrate + seed
```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

5) Set up the AI service (creates venv + installs deps)
```bash
pnpm setup:ai
```

6) Run the app
```bash
pnpm dev       # client + server
pnpm dev:ai    # AI service (separate terminal)
```

Optional: start monitoring
```bash
pnpm dev:metrics
```
