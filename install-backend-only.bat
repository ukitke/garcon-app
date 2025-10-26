@echo off
echo 🔧 Installazione Solo Backend (ignora mobile)
echo ============================================

REM Vai nella cartella backend
cd packages\backend

REM Rimuovi node_modules se esiste
if exist node_modules (
    echo 🗑️ Rimozione node_modules esistenti...
    rmdir /s /q node_modules
)

REM Rimuovi package-lock.json se esiste
if exist package-lock.json (
    echo 🗑️ Rimozione package-lock.json...
    del package-lock.json
)

REM Installa dipendenze SOLO per il backend (ignora workspace)
echo 📦 Installazione dipendenze backend...
call npm install --no-workspaces

REM Verifica installazione
echo ✅ Verifica installazione...
call npm list --depth=0

echo.
echo ✅ Installazione backend completata!
echo 🚀 Ora puoi avviare con: npm run dev
echo.
pause