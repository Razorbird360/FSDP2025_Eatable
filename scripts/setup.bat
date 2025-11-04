@echo off
echo 🚀 Setting up Eatable project...

REM Check if pnpm is installed
where pnpm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ pnpm is not installed. Please install it first:
    echo    npm install -g pnpm
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
call pnpm install

REM Copy environment files if they don't exist
if not exist apps\client\.env (
    echo 📝 Creating client .env file...
    copy apps\client\.env.example apps\client\.env
    echo ⚠️  Please update apps\client\.env with your values
)

if not exist apps\server\.env (
    echo 📝 Creating server .env file...
    copy apps\server\.env.example apps\server\.env
    echo ⚠️  Please update apps\server\.env with your values
)

REM Generate Prisma client
echo 🔧 Generating Prisma client...
call pnpm prisma:generate

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Update environment variables in apps\client\.env and apps\server\.env
echo 2. Run migrations: pnpm prisma:migrate
echo 3. Seed database: pnpm prisma:seed
echo 4. Start development servers: pnpm dev
