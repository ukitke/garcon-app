@echo off
echo 🔧 Test Fix Veloce
echo ==================

cd packages/backend

echo 🧪 Test compilazione TypeScript...
npx ts-node --transpile-only src/index-simple.ts &

echo ⏳ Attesa 3 secondi...
timeout /t 3 /nobreak >nul

echo 🔍 Test health check...
curl -f http://localhost:3000/health

if errorlevel 1 (
    echo ❌ Ancora problemi
) else (
    echo ✅ Fix funziona!
)

echo 🛑 Fermata server...
taskkill /f /im node.exe 2>nul

cd ..\..
pause