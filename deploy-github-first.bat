@echo off
echo 🚀 Deploy GitHub → Railway (Sequenza Corretta)
echo ===============================================

echo 📝 Sequenza:
echo    1. Test locale
echo    2. Push su GitHub PRIMA
echo    3. Attesa che Railway rilevi
echo    4. Monitoraggio deploy Railway
echo.

echo ⚠️  DEPLOYMENT ATTIVO: Se Railway sta già deployando,
echo    questo push creerà un nuovo deploy che sostituirà quello attivo.
echo    Railway gestisce automaticamente la coda dei deploy.
echo.

echo 🧪 Step 1: Test locale JavaScript...
cd packages/backend

echo 📦 Verifica dipendenze...
if not exist node_modules (
    npm install
)

echo 🚀 Test server JavaScript (3 secondi)...
start /B node src/index-railway-direct.js

echo ⏳ Attesa avvio...
timeout /t 3 /nobreak >nul

echo 🔍 Test health check...
curl -f http://localhost:3000/health

if errorlevel 1 (
    echo ❌ Test locale fallito - non posso deployare
    taskkill /f /im node.exe 2>nul
    pause
    exit /b 1
)

echo ✅ Test locale OK!
taskkill /f /im node.exe 2>nul

cd ..\..

echo.
echo 🚀 Step 2: Push su GitHub PRIMA del deploy Railway...
git add .
git commit -m "Railway JavaScript fix: pure JS backend ready for deploy"

echo 📤 Push su GitHub...
git push origin main

if errorlevel 1 (
    echo ❌ Errore durante il push GitHub
    pause
    exit /b 1
)

echo ✅ Push GitHub completato!
echo.
echo ⏳ Step 3: Attesa che Railway rilevi il push...
echo    Railway dovrebbe iniziare il deploy tra 5-15 secondi...
echo.
echo 📋 Se c'era già un deploy attivo:
echo    ✅ Railway cancellerà quello vecchio
echo    ✅ Inizierà il nuovo deploy con i tuoi file aggiornati
echo    ✅ Nessun problema - Railway gestisce tutto automaticamente
echo.

timeout /t 5 /nobreak >nul
echo    🔍 Controlla Railway dashboard ora!

echo.
echo 📊 Step 4: Monitoraggio Railway
echo ================================
echo.
echo 🌐 Vai su Railway dashboard:
echo    https://railway.app/dashboard
echo.
echo 👀 Cosa cercare nei log Railway:
echo    ✅ "Building..." - Railway sta compilando
echo    ✅ "node src/index-railway-direct.js" - Comando corretto
echo    ✅ "🚀 Garçon Backend Server (Railway Direct) running" - Server avviato
echo    ✅ "🔧 Server bound to 0.0.0.0" - Binding corretto
echo    ✅ "✅ Server started successfully!" - Tutto OK
echo.
echo 🔍 Test health check Railway:
echo    Una volta che vedi "Server started successfully!" nei log,
echo    testa l'URL pubblico Railway + /health
echo.
echo 📋 Se vedi errori nei log Railway:
echo    - Copia l'errore e fammi sapere
echo    - Controlleremo insieme cosa non va
echo.
echo ✅ Deploy GitHub completato - Railway dovrebbe deployare ora!
pause