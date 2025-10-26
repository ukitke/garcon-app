#!/bin/bash

API_URL="http://localhost:3000"

echo "🧪 Test rapidi API Garçon"
echo "========================"

# Test health check
echo "1. Health Check..."
curl -s "$API_URL/health" | jq '.' || echo "❌ Health check fallito"

# Test API info
echo -e "\n2. API Info..."
curl -s "$API_URL/api/v1" | jq '.' || echo "❌ API info fallito"

# Test registrazione utente (con dati fake)
echo -e "\n3. Test registrazione..."
curl -s -X POST "$API_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }' | jq '.' || echo "❌ Registrazione fallita"

# Test login
echo -e "\n4. Test login..."
curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq '.' || echo "❌ Login fallito"

# Test locations
echo -e "\n5. Test locations..."
curl -s "$API_URL/api/v1/locations/nearby?lat=45.4642&lng=9.1900" | jq '.' || echo "❌ Locations fallito"

echo -e "\n✅ Test completati!"