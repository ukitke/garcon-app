@echo off
echo 🚀 Deploy Railway - Versione Compilata
echo =======================================

echo 📝 Soluzione applicata:
echo    ✅ Compila TypeScript in JavaScript
echo    ✅ Usa Node.js puro (no ts-node)
echo    ✅ Risolve problemi di moduli ES
echo.

echo 🧪 Test build locale...
call test-build-railway.bat

if errorlevel 1 (
    echo ❌ Test build fallito
    pause
    exit /b 1
)

echo ✅ Build test OK!
echo.
echo 🚀 Caricamento su GitHub...
git add .
git commit -m "Railway fix: compile TypeScript to JavaScript, remove ts-node dependency"
git push origin main

if errorlevel 1 (
    echo ❌ Errore durante il push
    pause
    exit /b 1
)

echo ✅ Deploy avviato!
echo.
echo 📊 Modifiche principali:
echo    ✅ Dockerfile compila TypeScript in JavaScript
echo    ✅ CMD usa node invece di ts-node
echo    ✅ Railway.json configurato per JavaScript
echo    ✅ Server bind su 0.0.0.0:3000
echo    ✅ Health check ottimizzato
echo.
echo 🌐 Railway ora dovrebbe deployare correttamente!
echo    Il server sarà JavaScript puro, senza problemi di moduli.
echo.
echo 📋 Cosa aspettarsi nei log Railway:
echo    1. Build: Compilazione TypeScript → JavaScript
echo    2. Start: node dist/index-simple.js
echo    3. Server: Avvio su 0.0.0.0:3000
echo    4. Health: /health risponde OK
echo    5. Success: Deploy completato!
echo.
pause