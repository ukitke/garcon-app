@echo off
echo 🚀 AVVIO AUTOMATICO BACKEND GARÇON
echo ===================================
echo.

REM Controlla se Node.js è installato
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js non trovato. Installa da https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js trovato: 
node --version

REM Vai nella cartella backend
cd packages\backend

REM Controlla se le dipendenze sono installate
if not exist node_modules (
    echo 📦 Installazione dipendenze...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo ❌ Errore durante l'installazione delle dipendenze
        pause
        exit /b 1
    )
)

REM Verifica che la compilazione funzioni
echo 🔧 Verifica compilazione TypeScript...
call npm run build
if errorlevel 1 (
    echo ❌ Errore di compilazione. Eseguo riparazione automatica...
    cd ..\..
    node fix-final-errors.js
    cd packages\backend
    call npm run build
    if errorlevel 1 (
        echo ❌ Compilazione ancora fallita. Usa versione semplificata.
        goto :simple_version
    )
)

echo ✅ Compilazione riuscita!

REM Crea configurazione locale se non esiste
if not exist .env.local (
    echo 📝 Creazione configurazione locale...
    (
        echo NODE_ENV=development
        echo PORT=3000
        echo WEBSOCKET_PORT=3001
        echo JWT_SECRET=dev-jwt-secret-key-not-for-production
        echo DISABLE_MONITORING=true
        echo CORS_ORIGIN=*
        echo # Database opzionale - decommentare se necessario
        echo # DATABASE_URL=postgresql://user:pass@localhost:5432/garcon_db
        echo # REDIS_URL=redis://localhost:6379
    ) > .env.local
    echo ✅ File .env.local creato
)

REM Avvia il backend
echo 🚀 Avvio backend in modalità development...
echo.
echo 🌐 API sarà disponibile su: http://localhost:3000
echo 📊 Health check: http://localhost:3000/health
echo 📋 API Info: http://localhost:3000/api/v1
echo.
echo ⚠️  Premi Ctrl+C per fermare il server
echo.

call npm run dev
goto :end

:simple_version
echo 🔧 Avvio versione semplificata...
node src/index-simple.ts
goto :end

:end
echo.
echo 👋 Backend fermato
pause