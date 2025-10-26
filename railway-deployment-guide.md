# 🚂 Garçon App - Railway Deployment Guide

Guida completa per il deployment dell'applicazione Garçon su Railway.

## 📋 Prerequisiti

### 1. Account Railway
- Crea account su [railway.app](https://railway.app)
- Installa Railway CLI: `npm install -g @railway/cli`
- Login: `railway login`

### 2. Repository Setup
- Repository GitHub pubblico o privato
- Codice pushato su branch `main` o `master`

## 🚀 Deployment Steps

### Step 1: Preparazione Files

Assicurati di avere questi file nella root del progetto:

```
├── railway.json                 # Configurazione Railway
├── Dockerfile                   # Docker per backend
├── packages/backend/
│   ├── package.json
│   ├── src/index-railway-full.js
│   └── .env.example
└── .railwayignore              # File da ignorare
```

### Step 2: Configurazione Railway

1. **Crea nuovo progetto**:
   ```bash
   railway new garcon-backend
   cd garcon-backend
   ```

2. **Collega repository GitHub**:
   ```bash
   railway connect
   # Seleziona il tuo repository
   ```

3. **Configura variabili ambiente**:
   ```bash
   railway variables set NODE_ENV=production
   railway variables set PORT=3000
   railway variables set JWT_SECRET=your-super-secret-jwt-key
   railway variables set CORS_ORIGIN=*
   ```

### Step 3: Database Setup (Opzionale)

Se vuoi usare PostgreSQL:

```bash
# Aggiungi PostgreSQL al progetto
railway add postgresql

# Railway genererà automaticamente DATABASE_URL
# Puoi vederla con:
railway variables
```

### Step 4: Deploy

```bash
# Deploy dal repository
railway up

# Oppure deploy locale
railway deploy
```

## 📁 File di Configurazione

### railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node packages/backend/src/index-railway-full.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY packages/backend/package*.json ./packages/backend/
COPY package*.json ./

# Install dependencies
RUN cd packages/backend && npm ci --only=production

# Copy source code
COPY packages/backend/src ./packages/backend/src

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "packages/backend/src/index-railway-full.js"]
```

### .railwayignore
```
node_modules
.git
.env
.env.local
*.log
.DS_Store
packages/mobile
packages/tablet
packages/admin-web
infrastructure
docs
*.md
.github
```

## 🔧 Variabili Ambiente

### Obbligatorie
```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
```

### Opzionali
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# CORS
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# JWT
JWT_REFRESH_SECRET=your-refresh-secret

# Logging
LOG_LEVEL=info

# Payment Providers (Test Mode)
STRIPE_SECRET_KEY=sk_test_...
PAYPAL_CLIENT_ID=your_paypal_sandbox_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_secret

# AWS (per file upload)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Push Notifications
FCM_SERVER_KEY=your_fcm_server_key
```

## 🧪 Testing del Deployment

### 1. Health Check
```bash
curl https://your-app.railway.app/health
```

Risposta attesa:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "garcon-backend-full",
  "version": "1.0.0",
  "uptime": 123.45,
  "environment": "production",
  "database": {
    "status": "OK",
    "latency": "15ms"
  }
}
```

### 2. API Endpoints
```bash
# API Info
curl https://your-app.railway.app/api/v1

# Test Database (se configurato)
curl https://your-app.railway.app/api/v1/test-db

# Initialize Database
curl -X POST https://your-app.railway.app/api/v1/init-database
```

### 3. WebSocket Test
```javascript
// Test in browser console
const socket = io('https://your-app.railway.app');
socket.on('welcome', (data) => console.log(data));
```

## 📊 Monitoring e Logs

### Visualizza Logs
```bash
# Logs in tempo reale
railway logs

# Logs con filtro
railway logs --filter="ERROR"
```

### Metriche Railway
- CPU Usage
- Memory Usage
- Network I/O
- Request Count
- Response Time

### Custom Monitoring
Il backend include endpoint per monitoring:
- `/health` - Health check
- `/api/v1` - API status
- `/metrics` - Custom metrics (se implementato)

## 🔒 Sicurezza

### HTTPS
Railway fornisce automaticamente HTTPS con certificati SSL.

### Environment Variables
Tutte le variabili sono criptate e sicure.

### Network Security
- Firewall automatico
- DDoS protection
- Rate limiting (implementato nell'app)

## 🚀 Scaling

### Vertical Scaling
Railway scala automaticamente CPU e memoria.

### Horizontal Scaling
Per più istanze:
```bash
railway scale --replicas 3
```

### Database Scaling
PostgreSQL su Railway scala automaticamente.

## 🔄 CI/CD Setup

### GitHub Actions
```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Railway CLI
        run: npm install -g @railway/cli
        
      - name: Deploy to Railway
        run: railway deploy
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### Webhook Deployment
Railway può deployare automaticamente ad ogni push su GitHub.

## 🛠️ Troubleshooting

### Common Issues

1. **Build Fails**
   ```bash
   # Check build logs
   railway logs --deployment
   ```

2. **App Crashes**
   ```bash
   # Check runtime logs
   railway logs
   
   # Check health endpoint
   curl https://your-app.railway.app/health
   ```

3. **Database Connection Issues**
   ```bash
   # Verify DATABASE_URL
   railway variables
   
   # Test database endpoint
   curl https://your-app.railway.app/api/v1/test-db
   ```

4. **Port Issues**
   - Railway assegna automaticamente la porta
   - Usa `process.env.PORT` nel codice
   - Bind su `0.0.0.0`, non `localhost`

### Debug Commands
```bash
# Connect to running container
railway shell

# Check environment variables
railway variables

# View deployment status
railway status

# Restart service
railway restart
```

## 💰 Pricing

### Hobby Plan (Gratuito)
- $5 di crediti gratuiti al mese
- Perfetto per testing e sviluppo

### Pro Plan ($20/mese)
- $20 di crediti inclusi
- Scaling automatico
- Custom domains
- Priority support

### Stima Costi Garçon
- **Backend API**: ~$3-5/mese
- **PostgreSQL**: ~$2-3/mese
- **Totale**: ~$5-8/mese

## 🎯 Best Practices

### Performance
- Usa compressione gzip
- Implementa caching
- Ottimizza query database
- Usa connection pooling

### Security
- Valida sempre input utente
- Usa HTTPS per tutto
- Implementa rate limiting
- Monitora logs per attacchi

### Monitoring
- Configura health checks
- Monitora metriche custom
- Imposta alerting
- Backup regolari database

## 📞 Support

### Railway Support
- [Documentazione](https://docs.railway.app)
- [Discord Community](https://discord.gg/railway)
- [GitHub Issues](https://github.com/railwayapp/railway/issues)

### Garçon App Support
- Check logs: `railway logs`
- Health endpoint: `/health`
- API status: `/api/v1`

---

## 🚀 Quick Start Commands

```bash
# 1. Setup
npm install -g @railway/cli
railway login

# 2. Create project
railway new garcon-backend

# 3. Connect repo
railway connect

# 4. Set variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=your-secret-key

# 5. Add database (optional)
railway add postgresql

# 6. Deploy
railway up

# 7. Check status
railway status
railway logs
```

Il tuo backend Garçon sarà live su Railway! 🎉