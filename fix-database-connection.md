# 🔧 Fix Collegamento Database Railway

## 🔍 **Diagnosi Problemi**

### **Problema 1: DATABASE_URL Mancante**

**Verifica:**
1. Railway Dashboard → Progetto Garçon → Backend → Variables
2. Cerca `DATABASE_URL`

**Se mancante:**
1. Vai al servizio **PostgreSQL**
2. Tab **"Variables"** 
3. Copia il valore di `DATABASE_URL`
4. Vai al servizio **Backend**
5. Tab **"Variables"**
6. Aggiungi: Name: `DATABASE_URL`, Value: [quello copiato]

### **Problema 2: Servizi in Progetti Diversi**

**Verifica:**
- Backend e PostgreSQL devono essere nello **stesso progetto**

**Se separati:**
1. Crea nuovo database PostgreSQL nel progetto del backend
2. Oppure sposta il backend nel progetto del database

### **Problema 3: Deploy Non Completato**

**Verifica:**
1. Railway Dashboard → Backend service
2. Tab **"Deployments"**
3. L'ultimo deploy deve essere **"Success"**

**Se fallito:**
1. Clicca sul deploy fallito
2. Leggi i log per errori
3. Risolvi gli errori e rideploya

## 🚀 **Forzare Riconnessione**

Se tutto sembra corretto ma non funziona:

1. **Riavvia Backend:**
   - Backend service → Settings → Restart

2. **Rideploy:**
   - Fai un piccolo cambiamento al codice
   - Push su GitHub
   - Railway rifarà il deploy

3. **Verifica Logs:**
   - Backend service → Logs
   - Cerca errori di connessione database