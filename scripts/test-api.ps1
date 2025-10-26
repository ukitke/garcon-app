# PowerShell script per testare l'API
$API_URL = "http://localhost:3000"

Write-Host "🧪 Test rapidi API Garçon" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green

# Test health check
Write-Host "1. Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/health" -Method Get
    Write-Host "✅ Health Check OK: $($response.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health check fallito: $($_.Exception.Message)" -ForegroundColor Red
}

# Test API info
Write-Host "`n2. API Info..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/v1" -Method Get
    Write-Host "✅ API Info OK: $($response.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ API info fallito: $($_.Exception.Message)" -ForegroundColor Red
}

# Test registrazione utente
Write-Host "`n3. Test registrazione..." -ForegroundColor Yellow
try {
    $body = @{
        email = "test@example.com"
        password = "password123"
        firstName = "Test"
        lastName = "User"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$API_URL/api/v1/auth/register" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ Registrazione OK" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Registrazione: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test locations
Write-Host "`n4. Test locations..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/v1/locations/nearby?lat=45.4642&lng=9.1900" -Method Get
    Write-Host "✅ Locations OK" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Locations: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n✅ Test completati!" -ForegroundColor Green