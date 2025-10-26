@echo off
echo 🚀 Avvio Backend Garçon (versione super semplice)
echo ===============================================

REM Vai nella cartella backend
cd packages\backend

REM Controlla se node_modules esiste
if not exist node_modules (
    echo ❌ Dipendenze non installate!
    echo 📦 Esegui prima: install-backend-only.bat
    pause
    exit /b 1
)

REM Crea configurazione super minimale
echo 📝 Creazione configurazione super minimale...
(
echo NODE_ENV=development
echo PORT=3000
echo WEBSOCKET_PORT=3001
echo JWT_SECRET=dev-jwt-secret-key-not-for-production
echo DISABLE_MONITORING=true
echo CORS_ORIGIN=*
) > .env.local

REM Avvia con la versione semplificata
echo 🚀 Avvio backend super semplice...
echo.
echo 🌐 API: http://localhost:3000
echo 📊 Health: http://localhost:3000/health
echo 📋 API Info: http://localhost:3000/api/v1
echo 🧪 Test: http://localhost:3000/api/v1/test
echo.
echo ✅ Questa versione dovrebbe funzionare senza errori!
echo.

call npx ts-node src/index-simple.ts

pause