@echo off
echo 🔧 Configurazione Credenziali Git
echo =================================

echo Inserisci le tue credenziali GitHub:
echo.

set /p USERNAME="Nome utente GitHub: "
set /p EMAIL="Email GitHub: "

echo.
echo 📝 Configurazione Git...
git config --global user.name "%USERNAME%"
git config --global user.email "%EMAIL%"

echo.
echo ✅ Credenziali configurate:
echo    Nome: %USERNAME%
echo    Email: %EMAIL%
echo.
echo 💡 Nota: Se hai l'autenticazione a due fattori attiva,
echo    dovrai usare un Personal Access Token invece della password.
echo.
echo 🔑 Per creare un token:
echo    1. Vai su https://github.com/settings/tokens
echo    2. Clicca "Generate new token (classic)"
echo    3. Seleziona "repo" scope
echo    4. Usa il token come password
echo.
pause