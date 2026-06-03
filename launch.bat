@echo off
SETLOCAL EnableDelayedExpansion

echo ===================================================
echo   LuminaField - Electrostatic Sandbox Launcher
echo ===================================================

:: Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check for node_modules
if not exist "node_modules\" (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

:: Run the application
echo [INFO] Starting LuminaField development server...
echo [INFO] The application will be available at http://localhost:5173
echo.
call npm run dev

pause
