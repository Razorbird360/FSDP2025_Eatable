# Prisma Workflow Guide

## Core Commands
Always use `pnpm` to ensure you are using the project's installed dependencies.

### 1. Development (Local Changes)
When you make changes to `schema.prisma`:
```bash
pnpm prisma migrate dev
```
- **What it does**:
    - Creates a new migration file.
    - Applies it to your local database.
    - Regenerates the Prisma Client.
- **When to use**: Whenever you modify the schema.

### 2. Status Check
To check if your database is in sync with your migrations:
```bash
pnpm prisma migrate status
```
- **When to use**: After pulling code, or if you suspect issues.

### 3. Viewing Data
To open a GUI for your database:
```bash
pnpm prisma studio
```

### 4. Resetting (Last Resort)
If your local database is hopelessly out of sync:
```bash
pnpm prisma migrate reset
```
- **Warning**: Deletes all data and re-applies all migrations.

## Important Rules
> [!IMPORTANT]
> **NEVER** modify the database schema directly in the Supabase SQL Editor.
> Always change `schema.prisma` and run `pnpm prisma migrate dev`.

## Troubleshooting
- **Schema Drift**: If the DB has changes not in Prisma, run `pnpm prisma db pull`.
- **Merge Conflicts**: If migration files conflict, you may need to resolve them manually or reset.
