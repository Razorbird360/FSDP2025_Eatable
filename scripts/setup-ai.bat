@echo off
echo [AI] Setting up AI Service...
echo.

REM Check if Python is installed
where py >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed. Please install Python 3.13+ first:
    echo    https://www.python.org/downloads/
    echo.
    exit /b 1
)

echo [INFO] Python found:
py --version
echo.
echo [INFO] Note: Python 3.13+ is recommended for best compatibility
echo.

REM Navigate to ai-services directory
cd apps\ai-services

REM Check if venv already exists
if exist venv (
    echo [INFO] Virtual environment already exists, skipping creation...
) else (
    echo [SETUP] Creating virtual environment...
    py -m venv venv
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to create virtual environment
        cd ..\..
        exit /b 1
    )
)

REM Install dependencies directly into venv (without activation)
echo [SETUP] Installing dependencies...
venv\Scripts\python.exe -m pip install --upgrade pip >nul 2>nul
venv\Scripts\python.exe -m pip install -r requirements.txt

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    cd ..\..
    exit /b 1
)

REM Copy .env.example if .env doesn't exist
cd ..\..
if not exist apps\ai-services\.env (
    echo [SETUP] Creating AI service .env file...
    copy apps\ai-services\.env.example apps\ai-services\.env >nul
    echo [IMPORTANT] Update apps\ai-services\.env with your GEMINI_API_KEY
    echo    Get your key from: https://ai.google.dev/
)

echo.
echo [OK] AI Service setup complete!
echo.
echo [NEXT] Next steps:
echo    1. Add your GEMINI_API_KEY to apps\ai-services\.env
echo    2. Run the AI service: pnpm dev:ai
echo.
