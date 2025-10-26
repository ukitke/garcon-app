# 🔧 Setup Variabili d'Ambiente Railway

## 📋 **Variabili Richieste per Backend Completo**

Vai su Railway Dashboard → Il tuo progetto → Backend service → Tab "Variables"

### **1. Database (Automatiche)**
Railway collegherà automaticamente il database PostgreSQL. Queste variabili saranno create automaticamente:
- `DATABASE_URL` - URL completo database PostgreSQL
- `PGHOST` - Host database
- `PGPORT` - Porta database (5432)
- `PGDATABASE` - Nome database
- `PGUSER` - Username database
- `PGPASSWORD` - Password database

### **2. Variabili da Aggiungere Manualmente**

```env
# Ambiente
NODE_ENV=production

# JWT per autenticazione
JWT_SECRET=garcon-super-secret-jwt-key-2024-production

# CORS
CORS_ORIGIN=*

# Opzionali per funzionalità avanzate
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_test_your_stripe_key
PAYPAL_CLIENT_ID=your_paypal_client_id
```

### **3. Come Aggiungere le Variabili**

1. **Vai su Railway Dashboard**
2. **Seleziona il tuo progetto Garçon**
3. **Clicca sul servizio Backend**
4. **Vai su tab "Variables"**
5. **Clicca "New Variable"**
6. **Aggiungi una per una:**
   - Name: `NODE_ENV`, Value: `production`
   - Name: `JWT_SECRET`, Value: `garcon-super-secret-jwt-key-2024-production`
   - Name: `CORS_ORIGIN`, Value: `*`

### **4. Aggiungere Database PostgreSQL**

Se non hai ancora il database:

1. **Nel tuo progetto Railway, clicca "+ New"**
2. **Seleziona "Database"**
3. **Scegli "PostgreSQL"**
4. **Railway creerà automaticamente il database e le variabili**

### **5. Verifica Setup**

Dopo aver aggiunto le variabili:
1. **Railway rifarà automaticamente il deploy**
2. **Il backend si collegherà al database**
3. **Potrai testare con `test-database-backend.bat`**

## 🎯 **Risultato Finale**

Con queste variabili il backend avrà:
- ✅ Connessione PostgreSQL automatica
- ✅ Autenticazione JWT funzionante
- ✅ CORS configurato
- ✅ Ambiente produzione ottimizzato