# PowerShell script per Windows
Write-Host "🚀 Setup Garçon App per sviluppo locale (Windows)" -ForegroundColor Green

# Controlla prerequisiti
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js non installato. Scarica da https://nodejs.org/" -ForegroundColor Red
    exit 1
}

try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker non installato. Scarica Docker Desktop da https://docker.com/" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Installazione dipendenze..." -ForegroundColor Yellow
npm install

Set-Location packages/backend
npm install
Set-Location ../..

Write-Host "🐳 Avvio database e Redis..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml up -d postgres redis

Write-Host "⏳ Attendo che i servizi siano pronti..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "✅ Setup completato!" -ForegroundColor Green
Write-Host ""
Write-Host "Per avviare l'applicazione:" -ForegroundColor Cyan
Write-Host "  docker-compose -f docker-compose.dev.yml up backend" -ForegroundColor White
Write-Host ""
Write-Host "Endpoints disponibili:" -ForegroundColor Cyan
Write-Host "  🌐 API: http://localhost:3000" -ForegroundColor White
Write-Host "  🔌 WebSocket: http://localhost:3001" -ForegroundColor White
Write-Host "  🗄️ Database: localhost:5432" -ForegroundColor White
Write-Host "  🔴 Redis: localhost:6379" -ForegroundColor White