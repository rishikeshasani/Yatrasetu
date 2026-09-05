@echo off
title YatraSetu Backend (FastAPI)
echo ==============================================
echo Starting YatraSetu FastAPI + ML Backend...
echo ==============================================
cd /d "%~dp0"

:: 1. Check local .venv in backend directory
if exist "%~dp0.venv\Scripts\activate.bat" (
    echo [*] Activating local virtual environment (.venv)...
    call "%~dp0.venv\Scripts\activate.bat"
    goto :START_SERVER
)

:: 2. Check root project .venv directory
if exist "%~dp0..\.venv\Scripts\activate.bat" (
    echo [*] Activating project virtual environment (..\.venv)...
    call "%~dp0..\.venv\Scripts\activate.bat"
    goto :START_SERVER
)

:: 3. Check user home virtual environment (%USERPROFILE%\.venv)
if exist "%USERPROFILE%\.venv\Scripts\activate.bat" (
    echo [*] Activating user virtual environment (%USERPROFILE%\.venv)...
    call "%USERPROFILE%\.venv\Scripts\activate.bat"
    goto :START_SERVER
)

:: 4. Check if uvicorn command is available globally in PATH
where uvicorn >nul 2>nul
if %ERRORLEVEL% equ 0 (
    goto :START_SERVER
)

:: 5. Check if python is available in PATH and has uvicorn module
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    python -c "import uvicorn" >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        set RUN_WITH_PY=1
        goto :START_SERVER
    )
)

:: 6. If not found, display clear guidance
echo.
echo [ERROR] 'uvicorn' could not be found in PATH or any virtual environment.
echo.
echo To fix this:
echo 1. Ensure Python is installed and added to PATH.
echo 2. Open a terminal in this folder and install dependencies:
echo       pip install -r requirements.txt
echo    or activate your virtual environment before running this script.
echo.
pause
exit /b 1

:START_SERVER
echo.
echo Swagger API docs available at: http://localhost:8000/docs
echo Backend server running on:     http://localhost:8000
echo.
if defined RUN_WITH_PY (
    python -m uvicorn main:app --reload --port 8000
) else (
    uvicorn main:app --reload --port 8000
)
pause
