@echo off
echo 📋 Controllo File Prima dell'Upload
echo ===================================

echo 🔍 Verifica struttura progetto...
echo.

if exist "packages\backend" (
    echo ✅ Backend trovato
) else (
    echo ❌ Backend mancante
)

if exist "packages\mobile" (
    echo ✅ Mobile app trovata
) else (
    echo ❌ Mobile app mancante
)

if exist "packages\tablet" (
    echo ✅ Tablet app trovata
) else (
    echo ❌ Tablet app mancante
)

if exist "infrastructure" (
    echo ✅ Configurazioni infrastruttura trovate
) else (
    echo ❌ Configurazioni infrastruttura mancanti
)

if exist "Dockerfile" (
    echo ✅ Dockerfile trovato
) else (
    echo ❌ Dockerfile mancante
)

if exist "railway.json" (
    echo ✅ Configurazione Railway trovata
) else (
    echo ❌ Configurazione Railway mancante
)

if exist "package.json" (
    echo ✅ Package.json principale trovato
) else (
    echo ❌ Package.json principale mancante
)

echo.
echo 📊 Dimensione totale progetto:
for /f "tokens=3" %%a in ('dir /s /-c ^| find "File(s)"') do set size=%%a
echo    %size% bytes

echo.
echo 📁 File principali da caricare:
dir /b packages 2>nul
dir /b infrastructure 2>nul
dir /b *.json 2>nul
dir /b *.md 2>nul

echo.
echo 🚀 Tutto pronto per l'upload!
pause