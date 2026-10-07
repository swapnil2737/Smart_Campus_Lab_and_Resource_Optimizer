@echo off
title Smart Campus Lab - Backend Server
color 0A
echo ========================================================
echo        SMART CAMPUS LAB - STARTING BACKEND SERVER
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Checking Python Virtual Environment...
if exist "backend\.venv\Scripts\python.exe" (
    echo [OK] Virtual Environment found.
) else (
    echo [ERROR] Virtual environment not found in backend\.venv
    echo Please run: python -m venv backend\.venv
    pause
    exit /b
)

echo.
echo [2/2] Starting Flask Backend on http://127.0.0.1:5000 ...
echo Database: SQL Server (smart_campus_lab)
echo.
echo Keep this window OPEN while using Live Server in VS Code.
echo ========================================================
echo.

backend\.venv\Scripts\python.exe backend\app.py

pause
