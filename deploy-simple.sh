#!/bin/bash

echo "🚀 Deploy Semplice Garçon App"
echo "============================="

# Controlla se .env esiste
if [ ! -f .env.prod ]; then
    echo "📝 Creazione file .env.prod..."
    cat > .env.prod << EOF
# Database
POSTGRES_DB=garcon_prod
POSTGRES_USER=garcon
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Redis
REDIS_PASSWORD=$(openssl rand -base64 32)

# App
JWT_SECRET=$(openssl rand -base64 64)
CORS_ORIGIN=https://yourdomain.com

# Optional: Payment providers
STRIPE_SECRET_KEY=sk_live_...
PAYPAL_CLIENT_SECRET=...
EOF
    echo "✅ File .env.prod creato. Modifica le configurazioni se necessario."
    echo "⚠️  IMPORTANTE: Cambia le password e aggiungi le chiavi dei payment provider!"
    read -p "Premi ENTER per continuare..."
fi

# Carica variabili
set -a
source .env.prod
set +a

echo "🐳 Build e deploy con Docker..."

# Build immagini
docker-compose -f docker-compose.prod.yml build

# Avvia servizi
docker-compose -f docker-compose.prod.yml up -d

echo "⏳ Attendo che i servizi siano pronti..."
sleep 30

# Test health check
echo "🧪 Test health check..."
curl -f http://localhost:3000/health || {
    echo "❌ Health check fallito!"
    echo "📋 Log del backend:"
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
}

echo "✅ Deploy completato!"
echo ""
echo "🌐 App disponibile su:"
echo "  - API: http://localhost:3000"
echo "  - Health: http://localhost:3000/health"
echo ""
echo "📋 Comandi utili:"
echo "  - Logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  - Stop: docker-compose -f docker-compose.prod.yml down"
echo "  - Restart: docker-compose -f docker-compose.prod.yml restart"