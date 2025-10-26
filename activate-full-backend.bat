@echo off
echo 🗄️ Attivazione Backend Completo con Database
echo =============================================

echo 📝 Questo script attiverà il backend completo con:
echo    ✅ Connessione PostgreSQL
echo    ✅ Tutte le API endpoint
echo    ✅ WebSocket real-time
echo    ✅ Gestione utenti e autenticazione
echo    ✅ Inizializzazione database
echo.

echo ⚠️  PREREQUISITI:
echo    1. Database PostgreSQL configurato su Railway
echo    2. Variabile DATABASE_URL impostata su Railway
echo    3. Altre variabili d'ambiente configurate
echo.

set /p CONFIRM="🔄 Hai completato il setup database su Railway? (s/n): "
if /i not "%CONFIRM%"=="s" (
    echo ❌ Completa prima il setup database seguendo setup-database-railway.md
    pause
    exit /b 1
)

echo.
echo 🔧 Aggiornamento configurazione Railway...

REM Aggiorna Dockerfile per backend completo
echo 📝 Aggiornamento Dockerfile...
echo FROM node:18-alpine > Dockerfile.tmp
echo. >> Dockerfile.tmp
echo WORKDIR /app >> Dockerfile.tmp
echo. >> Dockerfile.tmp
echo # Installa dipendenze di sistema >> Dockerfile.tmp
echo RUN apk add --no-cache curl >> Dockerfile.tmp
echo. >> Dockerfile.tmp
echo # Copia package files del backend >> Dockerfile.tmp
echo COPY packages/backend/package*.json ./ >> Dockerfile.tmp
echo. >> Dockerfile.tmp
echo # Installa dipendenze >> Dockerfile.tmp
echo RUN npm install --production >> Dockerfile.tmp
echo. >> Dockerfile.tmp
echo # Copia backend completo >> Dockerfile.tmp
echo COPY packages/backend/src/index-railway-full.js ./src/ >> Dockerfile.tmp
echo. >> Dockerfile.tmp
echo # Esponi porta >> Dockerfile.tmp
echo EXPOSE 3000 >> Dockerfile.tmp
echo. >> Dockerfile.tmp
echo # Health check >> Dockerfile.tmp
echo HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \ >> Dockerfile.tmp
echo   CMD curl -f http://localhost:3000/health ^|^| exit 1 >> Dockerfile.tmp
echo. >> Dockerfile.tmp
echo # Avvia backend completo >> Dockerfile.tmp
echo CMD ["node", "src/index-railway-full.js"] >> Dockerfile.tmp

move Dockerfile.tmp Dockerfile

REM Aggiorna railway.json
echo 📝 Aggiornamento railway.json...
echo { > railway.json.tmp
echo   "$schema": "https://railway.app/railway.schema.json", >> railway.json.tmp
echo   "build": { >> railway.json.tmp
echo     "builder": "dockerfile" >> railway.json.tmp
echo   }, >> railway.json.tmp
echo   "deploy": { >> railway.json.tmp
echo     "startCommand": "node src/index-railway-full.js", >> railway.json.tmp
echo     "healthcheckPath": "/health", >> railway.json.tmp
echo     "healthcheckTimeout": 300, >> railway.json.tmp
echo     "restartPolicyType": "on_failure" >> railway.json.tmp
echo   } >> railway.json.tmp
echo } >> railway.json.tmp

move railway.json.tmp railway.json

echo ✅ Configurazione aggiornata!
echo.
echo 🚀 Caricamento backend completo su GitHub...
git add .
git commit -m "Activate full backend with PostgreSQL database support"
git push origin main

if errorlevel 1 (
    echo ❌ Errore durante il push
    pause
    exit /b 1
)

echo ✅ Backend completo caricato!
echo.
echo 📊 Railway dovrebbe ora deployare il backend completo con:
echo    ✅ Connessione PostgreSQL automatica
echo    ✅ Endpoint /api/v1/init-database per inizializzare DB
echo    ✅ Endpoint /api/v1/test-db per testare connessione
echo    ✅ Endpoint /api/v1/auth/register per registrare utenti
echo    ✅ WebSocket per real-time
echo.
echo 🔍 Prossimi passi:
echo    1. Attendi che Railway completi il deploy
echo    2. Testa l'URL: https://your-app.railway.app/api/v1
echo    3. Inizializza database: POST /api/v1/init-database
echo    4. Testa database: GET /api/v1/test-db
echo.
pause