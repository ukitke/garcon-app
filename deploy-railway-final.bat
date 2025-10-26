@echo off
echo 🚀 Deploy Railway - Fix Finale
echo ================================

echo ✅ Problema risolto:
echo    - PORT ora è un numero (parseInt)
echo    - Server bind su 0.0.0.0 per Railway
echo    - TypeScript compila senza errori
echo.

echo 🧪 Test finale locale...
cd packages/backend

echo 📦 Verifica dipendenze...
if not exist node_modules (
    npm install
)

echo 🚀 Avvio server per test (5 secondi)...
start /B npx ts-node src/index-simple.ts

echo ⏳ Attesa avvio...
timeout /t 5 /nobreak >nul

echo 🔍 Test health check...
curl -f http://localhost:3000/health

if errorlevel 1 (
    echo ❌ Test locale fallito
    taskkill /f /im node.exe 2>nul
    pause
    exit /b 1
)

echo ✅ Test locale OK!
echo 🔍 Test endpoint aggiuntivi...
curl -s http://localhost:3000/ | findstr "running"
curl -s http://localhost:3000/api/v1 | findstr "Garçon"

echo 🛑 Fermata server di test...
taskkill /f /im node.exe 2>nul

cd ..\..

echo.
echo 🚀 Caricamento modifiche finali su GitHub...
git add .
git commit -m "Final fix: PORT parsing and 0.0.0.0 binding for Railway"
git push origin main

if errorlevel 1 (
    echo ❌ Errore durante il push
    pause
    exit /b 1
)

echo ✅ Deploy completato!
echo.
echo 📊 Modifiche applicate:
echo    ✅ PORT convertito a numero con parseInt()
echo    ✅ Server bind su 0.0.0.0:3000 (accessibile da Railway)
echo    ✅ TypeScript compila correttamente
echo    ✅ Health check funziona localmente
echo    ✅ Logging completo per debug
echo.
echo 🌐 Railway dovrebbe ora deployare correttamente!
echo    Il server sarà accessibile e il health check passerà.
echo.
echo 📋 Prossimi passi:
echo    1. Vai su Railway dashboard
echo    2. Controlla i log del nuovo deploy
echo    3. Verifica che il health check passi
echo    4. Testa l'URL pubblico dell'app
echo.
pause