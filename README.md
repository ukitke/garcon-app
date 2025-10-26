# 🍽️ Garçon App

Una piattaforma completa per la gestione di ristoranti con app mobile per clienti e tablet per camerieri.

## 🚀 Deploy Veloce

### Opzione 1: Railway (Raccomandato)
1. Vai su [Railway](https://railway.app/)
2. Clicca "Deploy from GitHub"
3. Seleziona questo repository
4. Deploy automatico!

### Opzione 2: Render
1. Vai su [Render](https://render.com/)
2. Connetti il repository GitHub
3. Seleziona "Web Service"
4. Deploy automatico!

## 📱 Componenti

### Backend API
- **Tecnologie**: Node.js, Express, TypeScript
- **Database**: PostgreSQL con Redis per caching
- **Autenticazione**: JWT con middleware di sicurezza
- **Pagamenti**: Stripe, PayPal, Apple Pay, Google Pay, Satispay

### Mobile App (Clienti)
- **Tecnologie**: React Native, TypeScript
- **Funzionalità**: 
  - Selezione tavolo tramite QR code
  - Visualizzazione menu e ordinazioni
  - Pagamenti multipli e split bill
  - Tracking ordini in tempo reale
  - Chiamata cameriere

### Tablet App (Camerieri)
- **Tecnologie**: React Native, TypeScript
- **Funzionalità**:
  - Gestione chiamate clienti
  - Aggiornamento stato ordini
  - Dashboard operativa
  - Notifiche push

## 🛠️ Sviluppo Locale

### Prerequisiti
- Node.js 18+
- PostgreSQL
- Redis (opzionale)

### Setup Rapido
```bash
# Installa dipendenze
npm install

# Avvia solo il backend (per test)
start-backend-only.bat

# Avvia tutto
npm run dev
```

## 🏗️ Architettura

```
garcon-app/
├── packages/
│   ├── backend/          # API Server
│   ├── mobile/           # App Clienti
│   └── tablet/           # App Camerieri
├── infrastructure/       # Deploy configs
├── .github/workflows/    # CI/CD
└── docker/              # Containerization
```

## 🔧 Configurazione

### Variabili d'Ambiente
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/garcon
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key

# Pagamenti
STRIPE_SECRET_KEY=sk_test_...
PAYPAL_CLIENT_ID=your-paypal-id
```

## 📊 Features Implementate

- ✅ Autenticazione e autorizzazione
- ✅ Gestione menu e ordinazioni
- ✅ Sistema di pagamenti multipli
- ✅ Notifiche real-time
- ✅ Gestione tavoli e location
- ✅ Analytics e reporting
- ✅ Sistema di prenotazioni
- ✅ Monitoraggio e logging
- ✅ Deploy automatizzato

## 🚀 Deploy su Cloud

Il progetto include configurazioni per:
- **Railway**: Deploy con un click
- **Render**: Deploy automatico
- **Heroku**: Buildpack incluso
- **AWS**: Terraform completo
- **Docker**: Multi-stage build

## 📈 Monitoraggio

- Health checks automatici
- Logging strutturato
- Metriche performance
- Alerting integrato

## 🔒 Sicurezza

- Rate limiting
- Validazione input
- Sanitizzazione dati
- Audit logging
- Crittografia end-to-end

## 📞 Supporto

Per problemi o domande, apri una issue su GitHub.

---

**Sviluppato con ❤️ per l'industria della ristorazione**