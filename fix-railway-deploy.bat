@echo off
echo 🔧 Fix Railway Deploy
echo ====================

echo 📝 Aggiornamento file per Railway...

REM Commit delle modifiche
git add .
git commit -m "Fix Railway deployment: simplified backend entry point"

REM Push su GitHub
echo 🚀 Push delle modifiche...
git push origin main

if errorlevel 1 (
    echo ❌ Errore durante il push
    pause
    exit /b 1
)

echo ✅ Modifiche caricate!
echo.
echo 🚀 Ora Railway dovrebbe rifare il deploy automaticamente
echo    con il nuovo entry point semplificato.
echo.
echo 📊 Il nuovo backend include:
echo    - Health check ottimizzato: /health
echo    - Entry point semplificato: index-railway.ts
echo    - Timeout più lunghi per l'avvio
echo    - Meno dipendenze problematiche
echo.
echo 🌐 Controlla il deploy su Railway dashboard
pause