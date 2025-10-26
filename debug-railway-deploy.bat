@echo off
echo 🔍 Debug Railway Deploy
echo =======================

echo 📝 Test locale prima del deploy...

cd packages/backend

echo 🧪 Test server ultra-simple localmente...
echo.

REM Installa dipendenze minime
npm install express cors

echo 🚀 Avvio server di test...
start /B node src/index-ultra-simple.js

echo ⏳ Attesa avvio (5 secondi)...
timeout /t 5 /nobreak >nul

echo 🔍 Test health check locale...
curl -v http://localhost:3000/health

echo.
echo 🔍 Test root endpoint...
curl -v http://localhost:3000/

echo.
echo 🛑 Fermata server locale...
taskkill /f /im node.exe 2>nul

cd ..\..

if errorlevel 1 (
    echo ❌ Test locale fallito!
    echo    Il server non funziona neanche localmente
    pause
    exit /b 1
)

echo ✅ Test locale OK!
echo.
echo 🚀 Caricamento modifiche su GitHub...

git add .
git commit -m "Ultra-simple JavaScript backend for Railway debug"
git push origin main

if errorlevel 1 (
    echo ❌ Errore durante il push
    pause
    exit /b 1
)

echo ✅ Modifiche caricate!
echo.
echo 🚀 Railway dovrebbe ora deployare con:
echo    - Server JavaScript puro (no TypeScript)
echo    - Solo dipendenze essenziali (express, cors)
echo    - Logging completo per debug
echo    - Health check molto permissivo
echo.
echo 📊 Controlla i log su Railway per vedere cosa succede
pause