#!/bin/bash

echo "[AI] Setting up AI Service..."
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed. Please install Python 3.13+ first:"
    echo "   https://www.python.org/downloads/"
    exit 1
fi

# Check Python version (recommend 3.13+)
PYTHON_VERSION=$(python3 --version | grep -oP '\d+\.\d+' || python3 --version | sed 's/Python \([0-9]*\.[0-9]*\).*/\1/')
MAJOR_VERSION=$(echo $PYTHON_VERSION | cut -d. -f1)
MINOR_VERSION=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$MAJOR_VERSION" -lt 3 ] || ([ "$MAJOR_VERSION" -eq 3 ] && [ "$MINOR_VERSION" -lt 13 ]); then
    echo "[WARNING] Python 3.13+ is recommended"
    python3 --version
    echo "   You may encounter compatibility issues with older versions."
    echo ""
    read -p "   Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Navigate to ai-services directory
cd apps/ai-services

# Check if venv already exists
if [ -d "venv" ]; then
    echo "[INFO] Virtual environment already exists, skipping creation..."
else
    echo "[SETUP] Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create virtual environment"
        cd ../..
        exit 1
    fi
fi

# Activate venv and install dependencies
echo "[SETUP] Installing dependencies..."
source venv/bin/activate
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install dependencies"
    cd ../..
    exit 1
fi

# Copy .env.example if .env doesn't exist
cd ../..
if [ ! -f "apps/ai-services/.env" ]; then
    echo "[SETUP] Creating AI service .env file..."
    cp apps/ai-services/.env.example apps/ai-services/.env
    echo "[IMPORTANT] Update apps/ai-services/.env with your GEMINI_API_KEY"
    echo "   Get your key from: https://ai.google.dev/"
fi

echo ""
echo "[OK] AI Service setup complete!"
echo ""
echo "[NEXT] Next steps:"
echo "   1. Add your GEMINI_API_KEY to apps/ai-services/.env"
echo "   2. Run the AI service: pnpm dev:ai"
echo ""
