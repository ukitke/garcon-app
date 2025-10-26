@echo off
echo 🚂 GARÇON - QUICK RAILWAY DEPLOYMENT
echo ===================================

echo.
echo 📋 Checking prerequisites...

REM Check if Railway CLI is installed
railway --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Railway CLI not found
    echo 📦 Installing Railway CLI...
    npm install -g @railway/cli
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Railway CLI
        pause
        exit /b 1
    )
    echo ✅ Railway CLI installed
) else (
    echo ✅ Railway CLI found
)

echo.
echo 🔐 Checking Railway login...
railway whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Not logged in to Railway
    echo 🔑 Please login to Railway...
    railway login
    if %errorlevel% neq 0 (
        echo ❌ Login failed
        pause
        exit /b 1
    )
) else (
    echo ✅ Logged in to Railway
)

echo.
echo 🚀 Starting deployment...
echo.

REM Check if already in a Railway project
railway status >nul 2>&1
if %errorlevel% neq 0 (
    echo 🆕 Creating new Railway project...
    set /p PROJECT_NAME="Enter project name (default: garcon-backend): "
    if "%PROJECT_NAME%"=="" set PROJECT_NAME=garcon-backend
    railway new %PROJECT_NAME%
    if %errorlevel% neq 0 (
        echo ❌ Failed to create project
        pause
        exit /b 1
    )
) else (
    echo ✅ Already connected to Railway project
)

echo.
echo ⚙️ Setting environment variables...
railway variables set NODE_ENV=production
railway variables set PORT=3000

REM Generate JWT secret
for /f %%i in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set JWT_SECRET=%%i
railway variables set JWT_SECRET=%JWT_SECRET%
railway variables set CORS_ORIGIN=*

echo ✅ Environment variables set

echo.
set /p ADD_DB="Add PostgreSQL database? (y/n): "
if /i "%ADD_DB%"=="y" (
    echo 🗄️ Adding PostgreSQL...
    railway add postgresql
    echo ✅ PostgreSQL added
)

echo.
echo 🔨 Deploying application...
echo This may take several minutes...
railway up --detach

if %errorlevel% neq 0 (
    echo ❌ Deployment failed
    echo 📝 Check logs with: railway logs
    pause
    exit /b 1
)

echo ✅ Deployment started successfully!

echo.
echo 📊 Checking status...
railway status

echo.
echo 🎉 DEPLOYMENT COMPLETED!
echo ========================
echo.
echo 📋 Next Steps:
echo 1. 🌐 Check your application URL above
echo 2. 🧪 Test health endpoint: [YOUR_URL]/health
echo 3. 📋 Test API endpoint: [YOUR_URL]/api/v1
echo 4. 📱 Update mobile app API URL
echo.
echo 🔧 Useful Commands:
echo • railway logs          - View logs
echo • railway status        - Check status
echo • railway variables     - View env vars
echo • railway restart       - Restart service
echo.

set /p WATCH_LOGS="Watch deployment logs? (y/n): "
if /i "%WATCH_LOGS%"=="y" (
    echo 📝 Watching logs (Ctrl+C to stop):
    railway logs --follow
)

echo.
echo ✅ Deployment script completed!
pause