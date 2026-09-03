@echo off
title YatraSetu Backend (FastAPI)
echo ==============================================
echo Starting YatraSetu FastAPI + ML Backend...
echo ==============================================
cd /d "%~dp0"
echo Swagger API docs at: http://localhost:8000/docs
echo.
uvicorn main:app --reload --port 8000
pause
