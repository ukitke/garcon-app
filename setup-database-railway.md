# 🗄️ Setup Database PostgreSQL su Railway

## 📋 **Step 1: Aggiungere PostgreSQL su Railway**

### **1.1 Accedi a Railway Dashboard**
- Vai su https://railway.app/dashboard
- Seleziona il tuo progetto Garçon App

### **1.2 Aggiungi Database PostgreSQL**
1. Clicca **"+ New"** nel tuo progetto
2. Seleziona **"Database"**
3. Scegli **"PostgreSQL"**
4. Railway creerà automaticamente il database

### **1.3 Ottieni Credenziali Database**
1. Clicca sul servizio **PostgreSQL** appena creato
2. Vai su tab **"Variables"**
3. Copia queste variabili:
   - `DATABASE_URL` (URL completo)
   - `PGHOST` (host)
   - `PGPORT` (porta, di solito 5432)
   - `PGDATABASE` (nome database)
   - `PGUSER` (username)
   - `PGPASSWORD` (password)

## 📋 **Step 2: Configurare Backend per Database**

### **2.1 Aggiungere Variabili d'Ambiente**
Nel tuo servizio backend Railway:
1. Vai su tab **"Variables"**
2. Aggiungi queste variabili:

```
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here
CORS_ORIGIN=*
```

### **2.2 Collegare Database al Backend**
Railway collegherà automaticamente i servizi nello stesso progetto.

## 📋 **Step 3: Attivare Backend Completo**

Ora sostituiremo il backend semplificato con quello completo che usa il database.

### **3.1 File da Aggiornare**
- `packages/backend/src/index-railway-direct.js` → Backend completo
- `Dockerfile` → Configurazione per database
- Migrazioni database → Creazione tabelle

### **3.2 Migrazioni Database**
Il backend eseguirà automaticamente le migrazioni per creare:
- Tabelle utenti e autenticazione
- Tabelle menu e ordinazioni
- Tabelle pagamenti
- Tabelle notifiche
- Tabelle analytics

## 🎯 **Risultato Finale**

Dopo il setup avrai:
- ✅ Database PostgreSQL attivo
- ✅ Backend collegato al database
- ✅ Tutte le API funzionanti
- ✅ Migrazioni eseguite
- ✅ Sistema completo pronto per le app

## 📞 **Prossimi Passi**

1. Segui questa guida per setup Railway
2. Fammi sapere quando hai completato Step 1 e 2
3. Procederemo con l'attivazione del backend completo