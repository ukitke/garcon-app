# 🚂 Railway Quick Start - Garçon App

Deploy veloce dell'app Garçon su Railway in 5 minuti!

## 🚀 Deployment Rapido

### Opzione 1: Script Automatico (Raccomandato)
```bash
# Windows
quick-railway-deploy.bat

# Linux/Mac
npm run deploy:railway
```

### Opzione 2: Comandi Manuali
```bash
# 1. Installa Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Crea progetto
railway new garcon-backend

# 4. Set variabili ambiente
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set JWT_SECRET=your-secret-key

# 5. Aggiungi database (opzionale)
railway add postgresql

# 6. Deploy
railway up
```

## 🧪 Test Deployment

```bash
# Test automatico completo
npm run test:railway

# Test manuale
curl https://your-app.railway.app/health
```

## 📊 Monitoring

```bash
# Visualizza logs
railway logs

# Status deployment
railway status

# Restart se necessario
railway restart
```

## 🔧 Configurazione Avanzata

### Variabili Ambiente Aggiuntive
```bash
# Database
railway variables set DATABASE_URL=postgresql://...

# CORS
railway variables set CORS_ORIGIN=https://yourdomain.com

# Payment (Test Mode)
railway variables set STRIPE_SECRET_KEY=sk_test_...
railway variables set PAYPAL_CLIENT_ID=your_paypal_id

# AWS (File Upload)
railway variables set AWS_ACCESS_KEY_ID=your_key
railway variables set AWS_SECRET_ACCESS_KEY=your_secret
railway variables set AWS_S3_BUCKET=your-bucket
```

### Custom Domain
```bash
# Aggiungi dominio personalizzato
railway domain add yourdomain.com
```

## 📱 Aggiorna Mobile App

Dopo il deployment, aggiorna l'URL API nella mobile app:

```typescript
// packages/mobile/src/services/api.ts
const API_BASE_URL = 'https://your-app.railway.app';
```

## 🎯 Endpoints Disponibili

- `GET /health` - Health check
- `GET /api/v1` - API info
- `GET /api/v1/test` - Test endpoint
- `POST /api/v1/init-database` - Initialize DB
- `GET /api/v1/test-db` - Test database

## 💰 Costi Stimati

- **Hobby Plan**: $5 crediti gratuiti/mese
- **Backend API**: ~$3-5/mese
- **PostgreSQL**: ~$2-3/mese
- **Totale**: ~$5-8/mese

## 🆘 Troubleshooting

### Deployment Fails
```bash
railway logs --deployment
```

### App Crashes
```bash
railway logs
railway restart
```

### Database Issues
```bash
railway variables | grep DATABASE
curl https://your-app.railway.app/api/v1/test-db
```

## 📞 Support

- [Railway Docs](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- Health Check: `https://your-app.railway.app/health`

---

## ⚡ One-Liner Deploy

```bash
npx @railway/cli login && npx @railway/cli new garcon-backend && npx @railway/cli variables set NODE_ENV=production PORT=3000 JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") && npx @railway/cli up
```

🎉 **Il tuo backend Garçon sarà live in pochi minuti!**