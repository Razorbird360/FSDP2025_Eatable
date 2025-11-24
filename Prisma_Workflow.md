# Prisma Workflow Guide

## 1. Development Workflow (Feature Branch)

When you need to make database schema changes (DO THIS WHEN U NEED TO MERGE TO MAIN):

1.  **Create migration on your feature branch**:
    ```bash
    pnpm prisma migrate dev
    ```
    - This updates your **local DB (Docker)** only.
    - It creates a new SQL file in `prisma/migrations`.

2.  **Commit the migration folder**:
    - Include the new folder in `prisma/migrations/...` in a seperate, new commit.

3.  **Merge**:
    - Open PR → Code review → Merge into `main`.

---

## 2. Running Local Database

We use Docker for local development to avoid touching the production database.

**Start Local DB**:
```bash
scripts/start-local-db.bat
```

**What this script does:**
1.  **Safety Check**: Verifies your `.env` points to `localhost` (aborts if not).
2.  **Docker**: Starts the PostgreSQL container.
3.  **Migrate**: Runs `pnpm prisma migrate dev` to apply all migrations.
4.  **Seed**: Runs `pnpm prisma db seed` to populate sample data.

***When stopping docker container***
- Run `docker-compose down -v`  

> [!IMPORTANT]
> **NEVER** modify the database schema directly in the Supabase SQL Editor.
> Always change `schema.prisma` and use the workflow above.
