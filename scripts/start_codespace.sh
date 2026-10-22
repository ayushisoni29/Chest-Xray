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

# Install dependencies if not already installed
pip install -r requirements.txt

# Allow external mobile app CORS
export ALLOWED_ORIGINS="*"

echo "[+] Launching FastAPI Uvicorn server on port 8000..."
uvicorn main:app --host 0.0.0.0 --port 8000
