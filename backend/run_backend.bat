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
set "PY_CMD=python"
if exist "%USERPROFILE%\.venv\Scripts\python.exe" (
    echo [*] Found user virtual environment (%USERPROFILE%\.venv)
    set "PY_CMD=%USERPROFILE%\.venv\Scripts\python.exe"
    call "%USERPROFILE%\.venv\Scripts\activate.bat"
)
if exist "..\.venv\Scripts\python.exe" (
    echo [*] Found parent virtual environment (..\.venv)
    set "PY_CMD=..\.venv\Scripts\python.exe"
    call ..\.venv\Scripts\activate.bat
)
if exist ".venv\Scripts\python.exe" (
    echo [*] Found local virtual environment (.venv)
    set "PY_CMD=.venv\Scripts\python.exe"
    call .venv\Scripts\activate.bat
)

:: 3. Check for python in PATH
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if not exist "%PY_CMD%" (
        echo [!] Python is not found in PATH or virtual environments. Please install Python 3.10+ from python.org
        pause
        exit /b 1
    )
)

:: 4. Verify required packages (fastapi, uvicorn, python-multipart)
%PY_CMD% -c "import fastapi, uvicorn, multipart" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [*] Installing or updating missing backend packages...
    %PY_CMD% -m pip install -r requirements.txt
)

:: 5. Ensure Port 8000 is clean and available
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

%PY_CMD% -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

echo.
echo [!] Backend server stopped.
pause

