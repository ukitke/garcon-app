@echo off
echo 🚀 Avvio Backend Garçon (versione minimale)
echo ==========================================

REM Vai nella cartella backend
cd packages\backend

REM Controlla se node_modules esiste
if not exist node_modules (
    echo ❌ Dipendenze non installate!
    echo 📦 Esegui prima: install-backend-only.bat
    pause
    exit /b 1
)

REM Crea configurazione minimale
echo 📝 Creazione configurazione minimale...
(
echo NODE_ENV=development
echo PORT=3000
echo WEBSOCKET_PORT=3001
echo JWT_SECRET=dev-jwt-secret-key-not-for-production
echo DISABLE_MONITORING=true
echo CORS_ORIGIN=*
) > .env.local

REM Avvia con ts-node direttamente (più semplice)
echo 🚀 Avvio backend minimale...
echo.
echo 🌐 API: http://localhost:3000
echo 📊 Health: http://localhost:3000/health
echo.
echo ⚠️  Versione minimale per test veloce
echo.

call npx ts-node src/index.ts

pause