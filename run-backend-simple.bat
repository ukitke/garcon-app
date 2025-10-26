@echo off
echo 🚀 Avvio Backend Garçon (versione semplificata)
echo ==============================================

REM Vai nella cartella backend
cd packages\backend

REM Controlla se node_modules esiste
if not exist node_modules (
    echo ❌ Dipendenze non installate!
    echo 📦 Esegui prima: install-backend-only.bat
    pause
    exit /b 1
)

REM Crea configurazione locale semplificata
echo 📝 Creazione configurazione locale...
(
echo NODE_ENV=development
echo PORT=3000
echo WEBSOCKET_PORT=3001
echo JWT_SECRET=dev-jwt-secret-key-not-for-production
echo DISABLE_MONITORING=true
echo # Database disabilitato per test veloce
echo # DATABASE_URL=postgresql://user:pass@localhost:5432/db
echo # REDIS_URL=redis://localhost:6379
) > .env.local

REM Avvia il backend
echo 🚀 Avvio backend...
echo.
echo 🌐 API: http://localhost:3000
echo 📊 Health: http://localhost:3000/health
echo 📋 API Info: http://localhost:3000/api/v1
echo.
echo ⚠️  Nota: Database e Redis disabilitati per test veloce
echo.

REM Avvia con nodemon
call npx nodemon src/index.ts

pause