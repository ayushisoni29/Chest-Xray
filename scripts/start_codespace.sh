#!/bin/bash
# Startup script for Chest X-Ray AI backend inside GitHub Codespaces
set -e

echo "=========================================================="
echo " Starting Chest X-Ray AI Backend inside Codespaces"
echo "=========================================================="

cd "Backend chest x ray"

# Verify models
if [ ! -f "models/final_super_model_v3.keras" ] || [ ! -f "models/final_super_model_old.keras" ]; then
    echo "[!] WARNING: One or both .keras models are missing from Backend chest x ray/models/"
    echo "    Please ensure final_super_model_v3.keras (120MB) and final_super_model_old.keras (240MB)"
    echo "    are placed inside the models/ directory."
    echo ""
fi

# Install Linux headless libraries for OpenCV if running in Debian/Ubuntu container
if command -v apt-get &> /dev/null; then
    sudo apt-get update -qq && sudo apt-get install -y -qq libgl1 libglib2.0-0 || true
fi

# Install dependencies if not already installed
pip install -r requirements.txt
pip install opencv-python-headless

# Ensure MongoDB is running on port 27017
echo "[+] Checking MongoDB status on port 27017..."
if ! timeout 1 bash -c "echo > /dev/tcp/localhost/27017" 2>/dev/null; then
    echo "[+] MongoDB not detected on 27017. Attempting automatic start..."
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        echo "[+] Launching MongoDB via Docker container..."
        docker run -d --restart unless-stopped -p 27017:27017 --name mongodb mongo:latest 2>/dev/null || docker start mongodb 2>/dev/null || true
    fi

    if ! timeout 1 bash -c "echo > /dev/tcp/localhost/27017" 2>/dev/null; then
        if command -v service &> /dev/null; then
            sudo service mongodb start 2>/dev/null || true
        fi
    fi

    if ! timeout 1 bash -c "echo > /dev/tcp/localhost/27017" 2>/dev/null; then
        if command -v apt-get &> /dev/null; then
            sudo apt-get install -y -qq mongodb-server mongodb 2>/dev/null || true
            sudo service mongodb start 2>/dev/null || true
        fi
    fi
fi

# Allow external mobile app CORS
export ALLOWED_ORIGINS="*"

echo "[+] Launching FastAPI Uvicorn server on port 8000..."
uvicorn main:app --host 0.0.0.0 --port 8000
