@echo off
echo 🧪 Test Health Check Locale
echo ============================

echo 🚀 Avvio server di test...
cd packages/backend

REM Installa dipendenze se necessario
if not exist node_modules (
    echo 📦 Installazione dipendenze...
    npm install
)

echo 🔧 Avvio server Railway version...
start /B npx ts-node src/index-railway.ts

echo ⏳ Attesa avvio server (10 secondi)...
timeout /t 10 /nobreak >nul

echo 🔍 Test health check...
curl -f http://localhost:3000/health

if errorlevel 1 (
    echo ❌ Health check fallito localmente
    echo    Il server potrebbe non essere avviato correttamente
) else (
    echo ✅ Health check OK localmente!
    echo    Il problema potrebbe essere specifico di Railway
)

echo.
echo 🌐 Test altri endpoint:
curl http://localhost:3000/
curl http://localhost:3000/api/v1

echo.
echo 🛑 Premi un tasto per fermare il server...
pause >nul

REM Termina il processo ts-node
taskkill /f /im node.exe 2>nul
taskkill /f /im ts-node.exe 2>nul

echo ✅ Server fermato