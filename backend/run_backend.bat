@echo off
setlocal enabledelayedexpansion
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

:: 2. Robust Python Interpreter Resolution
set "PY_CMD="

:: Priority A: Local/Parent/User Virtual Environments
if exist ".venv\Scripts\python.exe" (
    set "PY_CMD=.venv\Scripts\python.exe"
    echo [*] Using local virtual environment (.venv)
) else if exist "..\.venv\Scripts\python.exe" (
    set "PY_CMD=..\.venv\Scripts\python.exe"
    echo [*] Using parent virtual environment (..\.venv)
) else if exist "%USERPROFILE%\.venv\Scripts\python.exe" (
    set "PY_CMD=%USERPROFILE%\.venv\Scripts\python.exe"
    echo [*] Using user virtual environment (%USERPROFILE%\.venv)
)

:: Priority B: Official Windows Python Launcher (py -3)
if not defined PY_CMD (
    where py >nul 2>nul
    if !ERRORLEVEL! equ 0 (
        py -3 -c "import sys" >nul 2>nul
        if !ERRORLEVEL! equ 0 (
            set "PY_CMD=py -3"
            echo [*] Using Python Launcher (py -3)
        )
    )
)

:: Priority C: System Python in PATH (testing execution to avoid broken MS Store stub)
if not defined PY_CMD (
    where python >nul 2>nul
    if !ERRORLEVEL! equ 0 (
        python -c "import sys" >nul 2>nul
        if !ERRORLEVEL! equ 0 (
            set "PY_CMD=python"
            echo [*] Using system Python (python)
        )
    )
)

:: Priority D: Standard user LocalAppData & ProgramFiles installation paths
if not defined PY_CMD (
    for %%P in (
        "%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
        "%ProgramFiles%\Python314\python.exe"
        "%ProgramFiles%\Python313\python.exe"
        "%ProgramFiles%\Python312\python.exe"
        "%ProgramFiles%\Python311\python.exe"
        "%ProgramFiles%\Python310\python.exe"
        "C:\Python314\python.exe"
        "C:\Python313\python.exe"
        "C:\Python312\python.exe"
        "C:\Python311\python.exe"
        "C:\Python310\python.exe"
    ) do (
        if not defined PY_CMD (
            if exist %%P (
                set "PY_CMD=%%~P"
                echo [*] Found installed Python: %%~P
            )
        )
    )
)

if not defined PY_CMD (
    echo [!] ERROR: Python interpreter could not be found.
    echo [*] Please install Python 3.10+ from https://www.python.org/downloads/
    echo [*] Ensure "Add Python to PATH" is checked during installation.
    pause
    exit /b 1
)

:: 3. Check for core required packages
%PY_CMD% -c "import fastapi, uvicorn" >nul 2>nul
if !ERRORLEVEL! neq 0 (
    echo [*] Installing or updating missing backend packages...
    %PY_CMD% -m pip install -r requirements.txt
)

:: 4. Ensure Port 8000 is clean and available
echo [*] Checking port 8000 availability...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /c:":8000" ^| findstr "LISTENING"') do (
    echo [!] Found existing process PID %%a on port 8000. Terminating old instance...
    taskkill /f /pid %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul 2>&1

:: 5. Startup details
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

