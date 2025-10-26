@echo off
echo 🧪 Test Collegamento Database Railway
echo ====================================

set /p RAILWAY_URL="🌐 Inserisci l'URL del tuo backend Railway: "

if "%RAILWAY_URL%"=="" (
    echo ❌ URL Railway richiesto
    pause
    exit /b 1
)

echo.
echo 🔍 Test collegamento database...

echo 📊 Test 1: Health Check (dovrebbe mostrare database status)
echo ----------------------------------------
curl -s "%RAILWAY_URL%/health" | findstr "database"
echo.

echo 📊 Test 2: Test Connessione Database Diretta
echo ----------------------------------------
curl -s "%RAILWAY_URL%/api/v1/test-db"
echo.

echo 📊 Test 3: Inizializzazione Tabelle Database
echo ----------------------------------------
curl -X POST "%RAILWAY_URL%/api/v1/init-database"
echo.

echo 📊 Test 4: Verifica Tabelle Create
echo ----------------------------------------
curl -s "%RAILWAY_URL%/api/v1/test-db"
echo.

echo.
echo 🎯 Risultati:
echo ✅ Se vedi "database": "connected" → Database collegato!
echo ✅ Se vedi "current_time" e "pg_version" → Database funziona!
echo ✅ Se vedi "Database initialized successfully" → Tabelle create!
echo.
echo ❌ Se vedi errori → Database non collegato correttamente
echo.
pause