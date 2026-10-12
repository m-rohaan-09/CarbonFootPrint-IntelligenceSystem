@echo off
title CFIS - Carbon Footprint Intelligence System
color 0A

set ROOT=%~dp0

:: ── Pre-requisite checks ──────────────────────────────
echo [0/5] Checking prerequisites...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Download from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo   Node.js: %%i

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed. It should come with Node.js.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do echo   npm: %%i

where python >nul 2>nul
if %errorlevel% neq 0 (
    where python3 >nul 2>nul
    if %errorlevel% neq 0 (
        echo WARNING: Python not found. ML service will not run ^(JS fallback will be used^).
        set PYTHON_AVAILABLE=0
    ) else (
        set PYTHON_CMD=python3
        set PYTHON_AVAILABLE=1
    )
) else (
    set PYTHON_CMD=python
    set PYTHON_AVAILABLE=1
)

if %PYTHON_AVAILABLE%==1 (
    for /f "tokens=*" %%i in ('%PYTHON_CMD% --version 2^>^&1') do echo   %%i
)

echo.

:: ── Install backend dependencies ──────────────────────
echo [1/5] Installing backend dependencies...
cd /d "%ROOT%backend"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies.
    pause
    exit /b 1
)
echo   Backend dependencies installed.
echo.

:: ── Install frontend dependencies ─────────────────────
echo [2/5] Installing frontend dependencies...
cd /d "%ROOT%frontend"
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies.
    pause
    exit /b 1
)
echo   Frontend dependencies installed.
echo.

:: ── Install Python ML dependencies ────────────────────
if %PYTHON_AVAILABLE%==1 (
    echo [3/5] Installing Python ML dependencies...
    cd /d "%ROOT%backend\ml"
    %PYTHON_CMD% -m pip install -r requirements.txt --quiet 2>nul
    if %errorlevel% neq 0 (
        echo WARNING: pip install failed. Trying with --user flag...
        %PYTHON_CMD% -m pip install -r requirements.txt --user --quiet 2>nul
    )
    echo   Python ML dependencies installed.
) else (
    echo [3/5] Skipping Python ML setup ^(Python not found^).
)
echo.

:: ── Create .env if missing ────────────────────────────
echo [4/5] Checking environment configuration...
if not exist "%ROOT%backend\.env" (
    echo   Creating default .env file...
    (
        echo PORT=5000
        echo JWT_SECRET=cfis-dev-secret-change-in-production
        echo JWT_REFRESH_SECRET=cfis-dev-refresh-secret-change-in-production
        echo ML_PORT=5001
        echo NODE_ENV=development
    ) > "%ROOT%backend\.env"
    echo   Default .env created. Edit backend\.env for production use.
) else (
    echo   .env file already exists.
)
echo.

:: ── Start all services ────────────────────────────────
echo [5/5] Starting services...
echo.

if %PYTHON_AVAILABLE%==1 (
    echo Starting Python ML Service on port 5001...
    start "CFIS ML Service" cmd /k "cd /d %ROOT%backend\ml && %PYTHON_CMD% app.py"
    timeout /t 3 /nobreak >nul
)

echo Starting Backend on port 5000...
start "CFIS Backend" cmd /k "cd /d %ROOT%backend && node server.js"

timeout /t 2 /nobreak >nul

echo Starting Frontend on port 3000...
start "CFIS Frontend" cmd /k "cd /d %ROOT%frontend && npm start"

echo.
echo ========================================
echo   CFIS is running!
echo   Backend   ^-^> http://localhost:5000
echo   Frontend  ^-^> http://localhost:3000
if %PYTHON_AVAILABLE%==1 (
echo   ML Service^-^> http://localhost:5001
)
echo ========================================
echo.
echo   Default login: admin@cfis.com / Admin@1234
echo.
echo   Close the opened terminal windows to stop.
echo.
pause
