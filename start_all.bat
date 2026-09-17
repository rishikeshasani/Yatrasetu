@echo off
title YatraSetu Universal Launcher
color 0A
echo ======================================================================
echo    Y A T R A S E T U   -   F U L L   S T A C K   L A U N C H E R
echo ======================================================================
echo.
echo [*] Launching Backend Server (FastAPI on http://localhost:8000)...
start "YatraSetu Backend (FastAPI)" cmd /c "cd /d ""%~dp0backend"" && call run_backend.bat"

timeout /t 2 /nobreak >nul

echo [*] Launching Frontend Server (Vite on http://localhost:5173)...
start "YatraSetu Frontend (Vite)" cmd /c "cd /d ""%~dp0frontend"" && call run_frontend.bat"

echo.
echo ======================================================================
echo  [+] FastAPI Backend  : http://localhost:8000
echo  [+] Swagger API Docs : http://localhost:8000/docs
echo  [+] React Frontend   : http://localhost:5173
echo ======================================================================
echo.
echo Both servers have been launched in dedicated terminal windows!
echo You may close this launcher window at any time.
timeout /t 6
