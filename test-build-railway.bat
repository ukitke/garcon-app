@echo off
echo 🔧 Test Build per Railway
echo =========================

cd packages/backend

echo 📦 Verifica dipendenze...
if not exist node_modules (
    npm install
)

echo 🏗️ Test compilazione TypeScript...
if exist dist (
    rmdir /s /q dist
)

echo 📝 Compilazione file per Railway...
npx tsc src/index-simple.ts src/app-simple.ts src/config/simple-logger.ts --outDir dist --module commonjs --target es2020 --esModuleInterop --allowSyntheticDefaultImports --moduleResolution node --skipLibCheck

if errorlevel 1 (
    echo ❌ Errore di compilazione
    pause
    exit /b 1
)

echo ✅ Compilazione OK!

echo 🧪 Test avvio server compilato...
start /B node dist/index-simple.js

echo ⏳ Attesa avvio (5 secondi)...
timeout /t 5 /nobreak >nul

echo 🔍 Test health check...
curl -f http://localhost:3000/health

if errorlevel 1 (
    echo ❌ Server compilato non funziona
    taskkill /f /im node.exe 2>nul
    pause
    exit /b 1
)

echo ✅ Server compilato funziona!

echo 🛑 Fermata server...
taskkill /f /im node.exe 2>nul

cd ..\..

echo.
echo ✅ Test completato con successo!
echo    - TypeScript compila correttamente
echo    - Server JavaScript funziona
echo    - Health check risponde
echo.
echo 🚀 Pronto per il deploy Railway!
pause