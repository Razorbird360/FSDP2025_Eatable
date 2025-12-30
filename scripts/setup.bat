@echo off
echo [SETUP] Setting up Eatable project...

REM Check if pnpm is installed
where pnpm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] pnpm is not installed. Please install it first:
    echo    npm install -g pnpm
    exit /b 1
)

REM Install dependencies
echo [SETUP] Installing dependencies...
call pnpm install

REM Copy environment files if they don't exist
if not exist apps\client\.env (
    echo [SETUP] Creating client .env file...
    copy apps\client\.env.example apps\client\.env
    echo [WARNING] Please update apps\client\.env with your values
)

if not exist apps\server\.env (
    echo [SETUP] Creating server .env file...
    copy apps\server\.env.example apps\server\.env
    echo [WARNING] Please update apps\server\.env with your values
)

REM Generate Prisma client
echo [SETUP] Generating Prisma client...
call pnpm prisma:generate

REM Setup AI service
echo.
echo [AI] Setting up AI service...
call scripts\setup-ai.bat
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] AI service setup failed, but continuing...
    echo    You can run scripts\setup-ai.bat manually later
)

echo.
echo [OK] Setup complete!
echo.
echo [NEXT] Next steps:
echo 1. Update environment variables in apps\client\.env, apps\server\.env, and apps\ai-services\.env
echo 2. Run migrations: pnpm prisma:migrate
echo 3. Seed database: pnpm prisma:seed
echo 4. Start development servers: pnpm dev (and pnpm dev:ai in separate terminal)
echo.
echo [INFO] Read PRISMA_WORKFLOW.md for database management instructions.
