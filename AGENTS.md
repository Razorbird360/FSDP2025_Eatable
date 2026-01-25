# Repository Guidelines

## Project Structure & Module Organization
This repo is a pnpm monorepo with three services under `apps/`:
- `apps/client/` React + Vite frontend (`src/`, `public/`).
- `apps/server/` Express API (`src/`, `prisma/`, `data/`).
- `apps/ai-services/` FastAPI service (`app/`, `models/`, `requirements.txt`).
Shared scripts live in `scripts/`, and container tooling in `docker/`.

## Build, Test, and Development Commands
- `pnpm install` installs workspace dependencies.
- `pnpm dev` runs client + server together.
- `pnpm dev:ai` runs the AI service (separate terminal).
- `pnpm dev:all` runs client, server, and AI service concurrently.
- `pnpm build` builds all services; use `pnpm build:client` / `pnpm build:server` for one app.
- `pnpm prisma:generate` / `pnpm prisma:migrate` / `pnpm prisma:seed` manage the database schema and seed data.
- `pnpm --filter client lint` runs ESLint for the frontend.
- `pnpm format` formats JS/JSX/JSON/MD via Prettier.

## Coding Style & Naming Conventions
Use Prettier for formatting and follow existing patterns in each app. The client uses ESLint; resolve lint errors before PRs. Prefer conventional React naming (components in `PascalCase`, hooks as `useX`) and keep server routes and modules aligned with existing filenames in `apps/server/src`.
When creating new files or substantial new logic, prefer TypeScript (`.ts`/`.tsx`). You may use JavaScript when extending existing JS files or logic; do not convert unrelated areas to TypeScript just because you can.
Prefix intentionally unused parameters with `_` to satisfy lint rules (e.g., `_next`).

## Testing Guidelines
No root-level automated test runner is configured. If you add tests, keep them close to the feature (or in the app’s preferred structure) and document how to run them in the relevant `README.md` plus a package script.

## Commit & Pull Request Guidelines
Recent commits use Conventional Commit prefixes (e.g., `feat:`, `fix:`). Keep messages short and scoped. PRs should include a clear description, linked issues (if any), testing notes, and UI screenshots when changes affect the frontend.
Keep changes limited to the branch’s feature scope; do not modify files outside the feature you are working on.

## Configuration & Secrets
Environment files live per app. Start from the `.env.example` files and keep secrets out of git. You will need Supabase credentials for the server/client and a Gemini API key for the AI service. Use `scripts/setup-ai.sh` or `scripts/setup-ai.bat` to prepare the AI virtual environment.
