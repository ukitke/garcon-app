@echo off
echo 🧪 Test Railway Online
echo ======================

set /p RAILWAY_URL="🌐 Inserisci l'URL Railway (es: https://your-app.railway.app): "

if "%RAILWAY_URL%"=="" (
    echo ❌ URL Railway richiesto
    pause
    exit /b 1
)

echo.
echo 🔍 Test endpoint Railway...

echo 📊 Test 1: Health Check
curl -f "%RAILWAY_URL%/health"
if errorlevel 1 (
    echo ❌ Health check fallito
) else (
    echo ✅ Health check OK!
)

echo.
echo 📊 Test 2: Root Endpoint
curl -f "%RAILWAY_URL%/"
if errorlevel 1 (
    echo ❌ Root endpoint fallito
) else (
    echo ✅ Root endpoint OK!
)

echo.
echo 📊 Test 3: API Info
curl -f "%RAILWAY_URL%/api/v1"
if errorlevel 1 (
    echo ❌ API endpoint fallito
) else (
    echo ✅ API endpoint OK!
)

echo.
echo 📊 Test 4: Test Endpoint
curl -f "%RAILWAY_URL%/api/v1/test"
if errorlevel 1 (
    echo ❌ Test endpoint fallito
) else (
    echo ✅ Test endpoint OK!
)

echo.
echo 🎉 Test completati!
echo.
echo 📋 Se tutti i test sono OK:
echo    ✅ Railway deploy è riuscito!
echo    ✅ Backend JavaScript funziona
echo    ✅ Health check passa
echo    ✅ API risponde correttamente
echo.
echo 🚀 Il tuo backend Garçon è online e funzionante!
pause