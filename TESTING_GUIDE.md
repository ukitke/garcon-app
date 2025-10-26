# 🧪 Garçon - Complete Testing Guide

Questa guida ti aiuterà a testare l'applicazione Garçon nella sua completezza, dalla configurazione iniziale ai flussi utente end-to-end.

## 🚀 Quick Start Testing

### Opzione 1: Test Automatizzato Completo
```bash
node test-complete-app.js
```

### Opzione 2: Test Manuale Passo-Passo
Segui questa guida per testare ogni componente manualmente.

## 📋 Pre-Requisiti

### Software Necessario
- ✅ Node.js 16+ installato
- ✅ React Native development environment
- ✅ Android Studio / Xcode (per mobile testing)
- ✅ PostgreSQL (opzionale, per test completi)
- ✅ Redis (opzionale, per caching)

### Verifica Installazione
```bash
node --version    # Dovrebbe essere 16+
npm --version     # Dovrebbe essere 8+
```

## 🏗️ Fase 1: Test Backend

### 1.1 Avvio Backend
```bash
# Opzione A: Avvio semplice (senza database)
cd packages/backend
npm run dev

# Opzione B: Avvio completo (con database)
node start-complete-app.js
```

### 1.2 Verifica Endpoint Base
Apri il browser e testa questi URL:

```
✅ http://localhost:3000/health
   Dovrebbe restituire: {"status":"OK","timestamp":"..."}

✅ http://localhost:3000/api/v1
   Dovrebbe mostrare la lista degli endpoint disponibili

✅ http://localhost:3000/api/v1/test
   Dovrebbe restituire: {"message":"Test endpoint working!"}
```

### 1.3 Test API con Postman/curl

#### Test Autenticazione
```bash
# Registrazione utente
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Login utente
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

#### Test Locations
```bash
# Ricerca ristoranti vicini
curl "http://localhost:3000/api/v1/locations/nearby?latitude=45.4642&longitude=9.1900&radius=5000"

# Dettagli ristorante
curl "http://localhost:3000/api/v1/locations/test-location-id"
```

#### Test Menu
```bash
# Menu ristorante
curl "http://localhost:3000/api/v1/menu/test-location-id"

# Categorie menu
curl "http://localhost:3000/api/v1/menu/test-location-id/categories"
```

## 📱 Fase 2: Test Mobile App

### 2.1 Preparazione Ambiente Mobile
```bash
cd packages/mobile

# Installa dipendenze
npm install

# Per iOS (solo su Mac)
cd ios && pod install && cd ..

# Verifica configurazione React Native
npx react-native doctor
```

### 2.2 Avvio Mobile App

#### Android
```bash
# Avvia Metro bundler
npx react-native start

# In un altro terminale, avvia su Android
npx react-native run-android
```

#### iOS (solo su Mac)
```bash
# Avvia Metro bundler
npx react-native start

# In un altro terminale, avvia su iOS
npx react-native run-ios
```

### 2.3 Test Funzionalità Mobile

#### Test di Base
1. **Avvio App**: L'app dovrebbe aprirsi senza crash
2. **Navigazione**: Testa la navigazione tra le tab
3. **API Connection**: Verifica che l'app si connetta al backend

#### Test Flusso Utente Completo

##### 1. Autenticazione
- [ ] Apri l'app
- [ ] Vai su "Sign Up" 
- [ ] Registra un nuovo utente
- [ ] Fai logout
- [ ] Fai login con le credenziali create

##### 2. Selezione Ristorante
- [ ] Vai nella tab "Home"
- [ ] Verifica che vengano mostrati i ristoranti (anche se mock)
- [ ] Seleziona un ristorante

##### 3. Selezione Tavolo
- [ ] Verifica che vengano mostrati i tavoli disponibili
- [ ] Seleziona un tavolo
- [ ] Unisciti alla sessione (con nome fantasy)

##### 4. Ordinazione
- [ ] Naviga nel menu
- [ ] Aggiungi items al carrello
- [ ] Modifica quantità
- [ ] Vai al checkout

##### 5. Pagamento
- [ ] Seleziona metodo di pagamento
- [ ] Conferma ordine
- [ ] Verifica tracking ordine

##### 6. Funzionalità Aggiuntive
- [ ] Chiama cameriere
- [ ] Visualizza storico ordini
- [ ] Gestisci profilo
- [ ] Visualizza notifiche

## 🔗 Fase 3: Test Integrazione

### 3.1 Test WebSocket
```bash
# Usa un client WebSocket per testare
# Connetti a: ws://localhost:3000

# Test eventi:
# - connection
# - order:status_updated
# - waiter:call_acknowledged
```

### 3.2 Test Database (se configurato)
```bash
# Test connessione database
curl -X POST http://localhost:3000/api/v1/init-database

# Test query database
curl http://localhost:3000/api/v1/test-db
```

### 3.3 Test Performance
```bash
# Test carico API
for i in {1..10}; do
  curl http://localhost:3000/health &
done
wait

# Verifica tempi di risposta
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/v1
```

## 🧪 Fase 4: Test Automatizzati

### 4.1 Test Backend
```bash
cd packages/backend

# Riabilita i test (se necessario)
find src/__tests__ -name "*.test.ts.disabled" -exec rename 's/\.disabled$//' {} \;

# Esegui test
npm test                    # Tutti i test
npm run test:security      # Test sicurezza
npm run test:performance   # Test performance
```

### 4.2 Test Mobile
```bash
cd packages/mobile

# Test unitari
npm test

# Test integrazione
npm run test:integration

# Test end-to-end
npm run test:e2e
```

## 🎯 Fase 5: Test Flussi Utente End-to-End

### Scenario 1: Nuovo Cliente
1. **Setup**: Apri l'app mobile
2. **Registrazione**: Crea nuovo account
3. **Scoperta**: Trova ristorante vicino
4. **Check-in**: Scansiona QR code tavolo
5. **Ordinazione**: Aggiungi items al carrello
6. **Pagamento**: Completa pagamento
7. **Tracking**: Monitora stato ordine
8. **Assistenza**: Chiama cameriere
9. **Recensione**: Lascia recensione

### Scenario 2: Ordinazione di Gruppo
1. **Host**: Crea sessione tavolo
2. **Partecipanti**: Altri utenti si uniscono
3. **Ordinazioni**: Ogni utente ordina individualmente
4. **Pagamento**: Pagamento separato o condiviso
5. **Tracking**: Monitoraggio ordini multipli

### Scenario 3: Prenotazione
1. **Ricerca**: Trova ristorante
2. **Disponibilità**: Controlla slot liberi
3. **Prenotazione**: Prenota tavolo
4. **Conferma**: Ricevi conferma
5. **Check-in**: Arriva e conferma prenotazione

## 📊 Metriche di Successo

### Performance Targets
- ⏱️ **API Response Time**: < 200ms per endpoint base
- 📱 **App Launch Time**: < 3 secondi
- 🔄 **WebSocket Latency**: < 100ms
- 💾 **Memory Usage**: < 100MB per processo

### Functionality Targets
- ✅ **API Uptime**: 99.9%
- 📱 **App Crash Rate**: < 0.1%
- 🔐 **Auth Success Rate**: > 99%
- 💳 **Payment Success Rate**: > 98%

## 🐛 Troubleshooting

### Backend Non Si Avvia
```bash
# Controlla porte occupate
netstat -an | findstr :3000

# Controlla log errori
cd packages/backend
npm run dev 2>&1 | tee backend.log
```

### Mobile App Non Si Connette
```bash
# Verifica IP backend (per device fisico)
ipconfig  # Windows
ifconfig  # Mac/Linux

# Aggiorna baseURL in packages/mobile/src/services/api.ts
# Da: http://localhost:3000
# A: http://YOUR_IP:3000
```

### Database Connection Issues
```bash
# Test connessione database
node test-database-connection.bat

# Verifica variabili ambiente
echo $DATABASE_URL  # Linux/Mac
echo %DATABASE_URL% # Windows
```

## 🔧 Configurazione Avanzata

### Database Setup Completo
```sql
-- Crea database
CREATE DATABASE garcon_db;

-- Crea utente
CREATE USER garcon WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE garcon_db TO garcon;
```

### Redis Setup
```bash
# Windows (con Chocolatey)
choco install redis-64

# Mac (con Homebrew)
brew install redis

# Linux (Ubuntu)
sudo apt install redis-server
```

### Environment Variables
Crea `.env.local` in `packages/backend/`:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://garcon:password123@localhost:5432/garcon_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-jwt-secret-key-not-for-production
CORS_ORIGIN=*
```

## 📈 Monitoring e Logging

### Log Files
- Backend: `packages/backend/logs/`
- Mobile: React Native debugger
- Database: PostgreSQL logs

### Health Checks
```bash
# Backend health
curl http://localhost:3000/health

# API health
curl http://localhost:3000/api/health

# Database health (se configurato)
curl http://localhost:3000/api/v1/test-db
```

## 🎉 Test di Accettazione

### Criteri di Successo
- [ ] Backend si avvia senza errori
- [ ] Tutti gli endpoint API rispondono
- [ ] Mobile app si compila e avvia
- [ ] Navigazione funziona correttamente
- [ ] WebSocket connection attiva
- [ ] Database connection (se configurato)
- [ ] Test automatizzati passano

### Performance Benchmarks
- [ ] API response time < 200ms
- [ ] App launch time < 3s
- [ ] Memory usage < 100MB
- [ ] No memory leaks dopo 1h uso

## 🚀 Deploy in Produzione

Una volta completati tutti i test:

```bash
# Deploy su Railway/AWS
npm run deploy:production

# Verifica deploy
curl https://your-app.railway.app/health
```

## 📞 Supporto

Se incontri problemi:
1. Controlla i log di errore
2. Verifica la configurazione
3. Consulta la documentazione API
4. Controlla le issue note nel repository

---

**🎯 Obiettivo**: Completare tutti i test con successo per garantire che l'applicazione Garçon sia pronta per l'uso in produzione!