@echo off
echo 🧪 Test Veloce Backend Garçon
echo =============================

REM Ferma tutto prima
docker-compose -f docker-compose.dev.yml down >nul 2>&1

REM Installa solo dipendenze backend
echo 📦 Installazione dipendenze backend...
cd packages\backend
call npm install
cd ..\..

REM Avvia database e Redis
echo 🐳 Avvio database e Redis...
docker-compose -f docker-compose.dev.yml up -d postgres redis

REM Aspetta che siano pronti
echo ⏳ Attendo 20 secondi...
timeout /t 20 /nobreak >nul

REM Avvia backend
echo 🚀 Avvio backend...
start /B docker-compose -f docker-compose.dev.yml up backend

REM Aspetta che il backend sia pronto
echo ⏳ Attendo che il backend sia pronto...
timeout /t 10 /nobreak >nul

REM Test API
echo 🧪 Test API...
echo.
curl -s http://localhost:3000/health
echo.
echo.
curl -s http://localhost:3000/api/v1
echo.
echo.
echo ✅ Se vedi JSON sopra, il backend funziona!
echo 🌐 Apri: http://localhost:3000/health nel browser
echo.
pause