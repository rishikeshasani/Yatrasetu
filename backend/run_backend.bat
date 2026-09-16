@echo off
title YatraSetu Backend (FastAPI + AI Engine)
color 0B
echo ======================================================================
echo    Y A T R A S E T U   B A C K E N D   S E R V E R   (FastAPI)
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Auto-configure .env from .env.example if missing
if not exist ".env" (
    if exist ".env.example" (
        echo [*] Initializing backend\.env from template...
        copy /y ".env.example" ".env" >nul
    )
)

:: 2. Activate Python Virtual Environment if present
if exist ".venv\Scripts\activate.bat" (
    echo [*] Activating local virtual environment
    call .venv\Scripts\activate.bat
)
if exist "..\.venv\Scripts\activate.bat" (
    echo [*] Activating parent virtual environment
    call ..\.venv\Scripts\activate.bat
)
if exist "%USERPROFILE%\.venv\Scripts\activate.bat" (
    echo [*] Activating user virtual environment
    call "%USERPROFILE%\.venv\Scripts\activate.bat"
)

:: 2. Ensure Port 8000 is clean and available
echo [*] Checking port 8000 availability...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /c:":8000" ^| findstr "LISTENING"') do (
    echo [!] Found existing process PID %%a on port 8000. Terminating old instance...
    taskkill /f /pid %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul 2>&1

:: 3. Startup details
echo.
echo ======================================================================
echo  [+] FastAPI Server URL   : http://localhost:8000
echo  [+] Swagger API Docs     : http://localhost:8000/docs
echo  [+] Health Check         : http://localhost:8000/health
echo ----------------------------------------------------------------------
echo  Evaluation Demo Credentials:
echo   - Devotee / Pilgrim     : tourist_demo@yatrasetu.org   / DemoPassword123!
echo   - Govt Administration   : govt_command@yatrasetu.org   / DemoPassword123!
echo   - Police Command        : police_command@yatrasetu.org / DemoPassword123!
echo   - Travel Operator       : travel_planner@yatrasetu.org / DemoPassword123!
echo   - Hotel Partner         : hotel_partner@yatrasetu.org  / DemoPassword123!
echo ======================================================================
echo.
echo [*] Starting Uvicorn server with Hot Reload on 0.0.0.0:8000...
echo [*] (Press Ctrl+C to stop the server)
echo.

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

echo.
echo [!] Backend server stopped.
pause

