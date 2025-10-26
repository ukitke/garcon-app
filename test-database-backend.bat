@echo off
echo 🧪 Test Backend Completo con Database
echo =====================================

set /p RAILWAY_URL="🌐 Inserisci l'URL Railway (es: https://your-app.railway.app): "

if "%RAILWAY_URL%"=="" (
    echo ❌ URL Railway richiesto
    pause
    exit /b 1
)

echo.
echo 🔍 Test backend completo...

echo 📊 Test 1: Health Check con Database
curl -f "%RAILWAY_URL%/health"
echo.

echo 📊 Test 2: API Info Completa
curl -f "%RAILWAY_URL%/api/v1"
echo.

echo 📊 Test 3: Inizializzazione Database
curl -X POST "%RAILWAY_URL%/api/v1/init-database"
echo.

echo 📊 Test 4: Test Connessione Database
curl -f "%RAILWAY_URL%/api/v1/test-db"
echo.

echo 📊 Test 5: Registrazione Utente Test
curl -X POST "%RAILWAY_URL%/api/v1/auth/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@garcon.app\",\"name\":\"Test User\"}"
echo.

echo 📊 Test 6: Lista Utenti
curl -f "%RAILWAY_URL%/api/v1/users"
echo.

echo 🎉 Test completati!
echo.
echo 📋 Se tutti i test sono OK:
echo    ✅ Backend completo funziona
echo    ✅ Database PostgreSQL collegato
echo    ✅ Tabelle create automaticamente
echo    ✅ API di autenticazione attive
echo    ✅ WebSocket disponibile
echo.
pause