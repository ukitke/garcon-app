@echo off
echo 🚀 Deploy Railway - JavaScript Diretto
echo =======================================

echo 📝 Soluzione finale:
echo    ✅ File JavaScript puro (no TypeScript)
echo    ✅ Niente ts-node, niente compilazione
echo    ✅ Solo Node.js + Express + CORS
echo    ✅ Server bind su 0.0.0.0:3000
echo.

echo 🧪 Test JavaScript diretto...
cd packages/backend

echo 📦 Verifica dipendenze...
if not exist node_modules (
    npm install
)

echo 🚀 Test server JavaScript (5 secondi)...
start /B node src/index-railway-direct.js

echo ⏳ Attesa avvio...
timeout /t 5 /nobreak >nul

echo 🔍 Test health check...
curl -f http://localhost:3000/health

if errorlevel 1 (
    echo ❌ Test JavaScript fallito
    taskkill /f /im node.exe 2>nul
    pause
    exit /b 1
)

echo ✅ JavaScript funziona!
echo 🔍 Test endpoint aggiuntivi...
curl -s http://localhost:3000/ | findstr "running"
curl -s http://localhost:3000/api/v1 | findstr "Garçon"

echo 🛑 Fermata server di test...
taskkill /f /im node.exe 2>nul

cd ..\..

echo.
echo 🚀 Caricamento versione JavaScript su GitHub...
git add .
git commit -m "Railway final fix: pure JavaScript backend, no TypeScript compilation"
git push origin main

if errorlevel 1 (
    echo ❌ Errore durante il push
    pause
    exit /b 1
)

echo ✅ Deploy JavaScript avviato!
echo.
echo 📊 Soluzione finale:
echo    ✅ File: index-railway-direct.js (JavaScript puro)
echo    ✅ Dipendenze: express, cors, helmet, compression
echo    ✅ Niente TypeScript, niente ts-node
echo    ✅ Dockerfile: COPY + CMD node
echo    ✅ Railway.json: startCommand node
echo    ✅ Server: 0.0.0.0:3000 (Railway compatible)
echo    ✅ Health: /health endpoint funzionante
echo.
echo 🌐 Railway dovrebbe ora deployare SENZA ERRORI!
echo    Niente più "Cannot use import statement outside a module"
echo.
echo 📋 Nei log Railway vedrai:
echo    1. Build: Copia file JavaScript
echo    2. Start: node src/index-railway-direct.js
echo    3. Server: 🚀 Garçon Backend Server running on port 3000
echo    4. Health: ✅ Health check requested
echo    5. Success: Deploy completato!
echo.
pause