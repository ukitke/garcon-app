@echo off
echo 🚀 Avvio Garçon Backend (versione locale semplificata)
echo ====================================================

REM Abilita esecuzione script per questa sessione
powershell -Command "Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process"

REM Vai nella cartella backend
cd packages\backend

REM Installa dipendenze
echo 📦 Installazione dipendenze...
call npm install

REM Crea file .env locale
echo 📝 Creazione configurazione locale...
echo NODE_ENV=development > .env.local
echo PORT=3000 >> .env.local
echo WEBSOCKET_PORT=3001 >> .env.local
echo JWT_SECRET=dev-jwt-secret-key-not-for-production >> .env.local
echo DISABLE_MONITORING=true >> .env.local
echo DATABASE_URL=sqlite:./dev.db >> .env.local
echo REDIS_URL=redis://localhost:6379 >> .env.local

REM Avvia il backend in modalità sviluppo
echo 🚀 Avvio backend...
echo.
echo 🌐 API sarà disponibile su: http://localhost:3000
echo 📊 Health check: http://localhost:3000/health
echo.
echo ⚠️  Nota: Usando SQLite locale invece di PostgreSQL
echo.
call npm run dev

pause