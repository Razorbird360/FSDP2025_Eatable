@echo off
setlocal EnableDelayedExpansion

echo 🐳 Starting local Docker database...

REM Start Docker Compose in detached mode
docker-compose up -d

echo ⏳ Waiting for database to be ready...
:wait_loop
docker exec eatable_postgres_local pg_isready -U postgres >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    timeout /t 2 >nul
    goto wait_loop
)

echo ✅ Database is ready!
echo.

echo 🔍 Checking DATABASE_URL and DIRECT_URL in apps\server\.env...

set "ENV_FILE=apps\server\.env"
if not exist "%ENV_FILE%" (
    echo ❌ Error: %ENV_FILE% not found.
    goto fail
)

REM Read DATABASE_URL and DIRECT_URL from .env file
set "DB_URL="
set "DIRECT_URL="
for /f "usebackq tokens=1* delims==" %%A in ("%ENV_FILE%") do (
    if "%%A"=="DATABASE_URL" set "DB_URL=%%B"
    if "%%A"=="DIRECT_URL" set "DIRECT_URL=%%B"
)

REM Remove quotes if present
set "DB_URL=%DB_URL:"=%"
set "DIRECT_URL=%DIRECT_URL:"=%"

if "%DB_URL%"=="" (
    echo ❌ Error: DATABASE_URL not found in %ENV_FILE%
    goto fail
)

REM Check DATABASE_URL for localhost or 127.0.0.1
echo %DB_URL% | findstr /C:"localhost" >nul
if %ERRORLEVEL% EQU 0 goto check_direct_url
echo %DB_URL% | findstr /C:"127.0.0.1" >nul
if %ERRORLEVEL% EQU 0 goto check_direct_url

echo.
echo ❌ SAFETY CHECK FAILED: DATABASE_URL
echo    Your DATABASE_URL does not appear to point to a local database.
echo    Current value: %DB_URL%
goto fail_message

:check_direct_url
REM If DIRECT_URL exists, check it too
if "!DIRECT_URL!"=="" goto check_pass

echo %DIRECT_URL% | findstr /C:"localhost" >nul
if %ERRORLEVEL% EQU 0 goto check_pass
echo %DIRECT_URL% | findstr /C:"127.0.0.1" >nul
if %ERRORLEVEL% EQU 0 goto check_pass

echo.
echo ❌ SAFETY CHECK FAILED: DIRECT_URL
echo    Your DIRECT_URL does not appear to point to a local database.
echo    Current value: %DIRECT_URL%
echo.
echo    Prisma uses DIRECT_URL for migrations when it's defined.
goto fail_message

:fail_message
echo.
echo    Please update %ENV_FILE% to point to localhost:
echo    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eatable_db?schema=public"
echo    DIRECT_URL="postgresql://postgres:postgres@localhost:5432/eatable_db?schema=public"
echo.
echo    OR comment out DIRECT_URL if you don't need it for local development:
echo    # DIRECT_URL="..."
echo.
echo    Script aborted to prevent accidental production changes.
pause
exit /b 1

:fail
goto fail_message

:check_pass
echo ✅ DATABASE_URL and DIRECT_URL point to local database. Proceeding...
echo.

echo 🚀 Applying migrations...
call pnpm --filter server prisma:migrate

echo 🌱 Seeding database...
call pnpm --filter server prisma:seed

echo.
echo 🎉 Local database setup complete!
pause
