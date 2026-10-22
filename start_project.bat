@echo off
title Chest X-Ray AI Multi-Disease Detection Launcher
color 0b

echo =====================================================================
echo    Chest X-Ray Multi-Disease Detection & Grad-CAM Explainability
echo                 Major Project 7th Semester Launcher
echo =====================================================================
echo.

echo [1/2] Starting Backend FastAPI Server on http://127.0.0.1:8000 ...
start "Chest X-Ray AI - Backend (FastAPI)" cmd /k "cd /d "%~dp0Backend chest x ray" && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend Vite Web Dashboard on http://localhost:5173 ...
start "Chest X-Ray AI - Frontend (React + Vite)" cmd /k "cd /d "%~dp0Frontend chest x ray" && npm run dev"

echo.
echo =====================================================================
echo Both servers have been launched in separate terminal windows!
echo - Backend API Docs:   http://127.0.0.1:8000/docs
echo - Frontend Dashboard: http://localhost:5173
echo =====================================================================
echo.
pause
