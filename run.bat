@echo off
echo.
echo   Urban Heat AI Platform v2.0
echo   =====================================
echo.

where python >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.10+
    pause
    exit /b 1
)

if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt --quiet

echo.
echo Starting Urban Heat AI on http://localhost:8000
echo    Homepage:   http://localhost:8000
echo    Dashboard:  http://localhost:8000/dashboard.html
echo    Database:   http://localhost:8000/database.html
echo    API Docs:   http://localhost:8000/docs
echo.

python -m backend.main
pause
