@echo off
echo 🔧 Deploy Railway - Versione Corretta
echo =====================================

echo 📝 Modifiche applicate:
echo    ✅ Server bind su 0.0.0.0 (non localhost)
echo    ✅ Logging completo per debug
echo    ✅ Error handling migliorato
echo    ✅ Health check ottimizzato
echo.

echo 🧪 Test locale veloce...
cd packages/backend

REM Controlla se le dipendenze sono installate
if not exist node_modules (
    echo 📦 Installazione dipendenze...
    npm install
)

echo 🚀 Test avvio server (5 secondi)...
start /B npx ts-node src/index-simple.ts

echo ⏳ Attesa avvio...
timeout /t 5 /nobreak >nul

echo 🔍 Test health check...
curl -f http://localhost:3000/health

if errorlevel 1 (
    echo ❌ Test locale fallito
    echo    Controlla i log sopra per errori
    taskkill /f /im node.exe 2>nul
    pause
    exit /b 1
)

echo ✅ Test locale OK!

REM Ferma il server di test
taskkill /f /im node.exe 2>nul

cd ..\..

echo.
echo 🚀 Caricamento su GitHub...
git add .
git commit -m "Fix Railway deployment: bind to 0.0.0.0 and improved logging"
git push origin main

if errorlevel 1 (
    echo ❌ Errore durante il push
    pause
    exit /b 1
)

echo ✅ Deploy avviato!
echo.
echo 📊 Modifiche principali:
echo    - Server ora fa bind su 0.0.0.0:3000 (accessibile da Railway)
echo    - Logging completo per debug del problema
echo    - Error handling migliorato per startup
echo    - Health check con logging dettagliato
echo.
echo 🌐 Railway dovrebbe ora riuscire a raggiungere /health
echo    Controlla i log su Railway per conferma
echo.
pause