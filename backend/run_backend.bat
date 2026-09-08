@echo off
title YatraSetu Backend (FastAPI)
echo ==============================================
echo Starting YatraSetu FastAPI + ML Backend...
echo ==============================================

cd /d "%~dp0"

if exist .venv\Scripts\activate.bat call .venv\Scripts\activate.bat
if exist ..\.venv\Scripts\activate.bat call ..\.venv\Scripts\activate.bat
if exist "%USERPROFILE%\.venv\Scripts\activate.bat" call "%USERPROFILE%\.venv\Scripts\activate.bat"

netstat -ano | findstr LISTENING | findstr :8000 >nul 2>&1
if %ERRORLEVEL% equ 0 goto :ALREADY_RUNNING

:START_SERVER
echo:
echo Swagger API docs available at: http://localhost:8000/docs
echo Backend server running on:     http://localhost:8000
echo:

python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
pause
exit /b 0

:ALREADY_RUNNING
echo:
echo =========================================================
echo  [SUCCESS] YatraSetu Backend is ALREADY RUNNING!
echo =========================================================
echo  Server URL:   http://localhost:8000
echo  Swagger Docs: http://localhost:8000/docs
echo =========================================================
echo:
echo Backend process is active on port 8000.
echo Press any key to exit this window.
pause >nul
exit /b 0
