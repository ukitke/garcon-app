# 🚀 Garçon App - Guida Rapida

## Test Locale (5 minuti)

### 1. Prerequisiti
```bash
node --version  # >= 18
docker --version
```

### 2. Setup Veloce
```bash
# Clona e installa
git clone <repo-url>
cd garcon-app
npm install

# Setup automatico
npm run dev:setup
```

### 3. Avvia l'App
```bash
# Avvia tutto con Docker
npm run dev:simple
```

### 4. Testa l'API
```bash
# In un altro terminale
npm run test:api
```

### 5. Accedi all'App
- 🌐 API: http://localhost:3000
- 📊 Health: http://localhost:3000/health
- 📋 API Docs: http://localhost:3000/api/v1

## Deployment Semplice

### Opzione 1: Heroku (più facile)
```bash
# Installa Heroku CLI
# Crea app
heroku create garcon-app-demo
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini

# Deploy
git push heroku main
```

### Opzione 2: Railway (alternativa)
```bash
# Connetti a Railway
railway login
railway init
railway add postgresql redis
railway deploy
```

### Opzione 3: Docker Compose (VPS)
```bash
# Su qualsiasi VPS con Docker
docker-compose up -d
```