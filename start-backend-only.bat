@echo off
echo 🚀 Avvio Solo Backend Garçon (senza mobile)
echo ==========================================

REM Controlla se Node.js è installato
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js non trovato. Installa da https://nodejs.org/
    pause
    exit /b 1
)

REM Controlla se Docker è installato
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker non trovato. Installa Docker Desktop da https://docker.com/
    pause
    exit /b 1
)

echo ✅ Prerequisiti OK

REM Installa solo dipendenze backend
echo 📦 Installazione dipendenze backend...
cd packages\backend
if not exist node_modules (
    call npm install
)
cd ..\..

REM Avvia servizi Docker
echo 🐳 Avvio database e Redis...
docker-compose -f docker-compose.dev.yml up -d postgres redis

REM Aspetta che i servizi siano pronti
echo ⏳ Attendo che i servizi siano pronti...
timeout /t 15 /nobreak >nul

REM Avvia solo il backend
echo 🚀 Avvio backend API...
echo.
echo 🌐 API sarà disponibile su: http://localhost:3000
echo 📊 Health check: http://localhost:3000/health
echo.
docker-compose -f docker-compose.dev.yml up backend

pause