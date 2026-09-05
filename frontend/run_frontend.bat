@echo off
title YatraSetu Frontend (Vite)
echo ==============================================
echo Starting YatraSetu React + Vite Frontend...
echo ==============================================
cd /d "%~dp0"

:: Check if npm is available in PATH
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "C:\Program Files\nodejs\npm.cmd" (
        echo [*] Adding Node.js to PATH from Program Files...
        set "PATH=C:\Program Files\nodejs;%PATH%"
    ) else if exist "%USERPROFILE%\.gemini\antigravity\scratch\tools\nodejs\npm.cmd" (
        echo [*] Adding Node.js to PATH from tools directory...
        set "PATH=%USERPROFILE%\.gemini\antigravity\scratch\tools\nodejs;%PATH%"
    )
)

echo Frontend server starting...
npm run dev
pause
