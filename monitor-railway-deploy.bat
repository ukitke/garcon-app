@echo off
echo 📊 Monitor Railway Deploy
echo =========================

echo 🔍 Questo script ti aiuta a monitorare il deploy Railway
echo.

:LOOP
echo ⏳ Controllo stato Railway...
echo.
echo 📋 Checklist Railway Deploy:
echo    □ Railway ha rilevato il push GitHub?
echo    □ Build è iniziato?
echo    □ Dockerfile viene processato correttamente?
echo    □ "node src/index-railway-direct.js" viene eseguito?
echo    □ Server si avvia su porta 3000?
echo    □ Health check /health risponde?
echo.

echo 🌐 Link utili:
echo    Railway Dashboard: https://railway.app/dashboard
echo    GitHub Repository: https://github.com/ukitke/garcon-app
echo.

echo 🔍 Comandi di test una volta che Railway è online:
echo    curl https://your-railway-url.railway.app/health
echo    curl https://your-railway-url.railway.app/api/v1
echo.

echo 📝 Log Railway da cercare:
echo    ✅ "FROM node:18-alpine" - Dockerfile inizia
echo    ✅ "COPY packages/backend/src/index-railway-direct.js" - File copiato
echo    ✅ "node src/index-railway-direct.js" - Comando avvio
echo    ✅ "🚀 Garçon Backend Server (Railway Direct) running" - Server OK
echo    ✅ "🔧 Server bound to 0.0.0.0" - Binding OK
echo    ✅ "✅ Server started successfully!" - Deploy completo
echo.

echo ❌ Errori da NON vedere:
echo    ❌ "Cannot use import statement outside a module" - Risolto!
echo    ❌ "ts-node" - Non dovrebbe più apparire
echo    ❌ "TypeScript" - Non dovrebbe più apparire
echo    ❌ "Health check failed" - Dovrebbe essere risolto
echo.

set /p CONTINUE="🔄 Vuoi controllare di nuovo? (s/n): "
if /i "%CONTINUE%"=="s" goto LOOP

echo.
echo 📞 Se hai problemi:
echo    1. Copia l'errore dai log Railway
echo    2. Fammi sapere cosa vedi
echo    3. Risolveremo insieme
echo.
pause