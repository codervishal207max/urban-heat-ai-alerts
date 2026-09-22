@echo off
REM Urban Heat AI v2 — Quick Start Script for Windows
REM This script creates a local virtual environment, installs dependencies,
REM and starts the backend on localhost:8000 for local development.

echo.
echo   Urban Heat AI Platform v2.0
echo   =====================================
echo.

REM Check whether Python is installed before continuing.
where python >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.10+
    pause
    exit /b 1
)

REM Create a local virtual environment if it does not already exist.
if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
)

REM Activate the project environment for dependency installation and app startup.
call .venv\Scripts\activate.bat

REM Install all Python packages required by the project.
echo Installing dependencies...
pip install -r requirements.txt --quiet

echo.
echo Starting Urban Heat AI on http://localhost:8000
echo    Homepage:   http://localhost:8000
echo    Dashboard:  http://localhost:8000/dashboard.html
echo    Database:   http://localhost:8000/database.html
echo    API Docs:   http://localhost:8000/docs
echo.

REM Start the FastAPI app. It also serves the frontend static pages.
python -m backend.main
pause
