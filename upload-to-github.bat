@echo off
echo 🚀 Upload Garçon App su GitHub
echo ==============================

REM Controlla se git è installato
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git non installato. Scarica da https://git-scm.com/
    pause
    exit /b 1
)

echo ✅ Git trovato

REM Inizializza repository se non esiste
if not exist .git (
    echo 📁 Inizializzazione repository Git...
    git init
)

REM Configura repository remota
echo 🔗 Configurazione repository remota...
git remote remove origin 2>nul
git remote add origin https://github.com/ukitke/garcon-app.git

REM Aggiungi tutti i file
echo 📦 Aggiunta file al repository...
git add .

REM Commit
echo 💾 Commit dei file...
git commit -m "Initial commit: Garçon App with working backend and deployment configs"

REM Push su GitHub
echo 🚀 Upload su GitHub...
git branch -M main
git push -u origin main --force

if errorlevel 1 (
    echo ❌ Errore durante l'upload. Possibili cause:
    echo    - Credenziali GitHub non configurate
    echo    - Repository non accessibile
    echo    - Problemi di connessione
    echo.
    echo 💡 Soluzioni:
    echo    1. Configura credenziali: git config --global user.name "Your Name"
    echo    2. Configura email: git config --global user.email "your.email@example.com"
    echo    3. Usa token GitHub invece della password
    pause
    exit /b 1
)

echo ✅ Upload completato con successo!
echo.
echo 🌐 Repository disponibile su:
echo    https://github.com/ukitke/garcon-app
echo.
echo 🚀 Ora puoi deployare su Railway:
echo    1. Vai su https://railway.app/
echo    2. Clicca "Deploy from GitHub"
echo    3. Seleziona "ukitke/garcon-app"
echo    4. Deploy automatico!
echo.
pause