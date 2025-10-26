#!/bin/bash

echo "🚀 Setup Garçon App per sviluppo locale"

# Controlla prerequisiti
command -v node >/dev/null 2>&1 || { echo "❌ Node.js non installato"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker non installato"; exit 1; }

echo "✅ Prerequisiti OK"

# Installa dipendenze
echo "📦 Installazione dipendenze..."
npm install
cd packages/backend && npm install && cd ../..

# Avvia servizi con Docker
echo "🐳 Avvio database e Redis..."
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Aspetta che i servizi siano pronti
echo "⏳ Attendo che i servizi siano pronti..."
sleep 10

# Esegui migrazioni database
echo "🗄️ Esecuzione migrazioni database..."
cd packages/backend
npm run migrate:dev || echo "⚠️ Migrazioni fallite, continuo comunque..."
cd ../..

echo "✅ Setup completato!"
echo ""
echo "Per avviare l'applicazione:"
echo "  npm run dev"
echo ""
echo "Endpoints disponibili:"
echo "  🌐 API: http://localhost:3000"
echo "  🔌 WebSocket: http://localhost:3001"
echo "  🗄️ Database: localhost:5432"
echo "  🔴 Redis: localhost:6379"