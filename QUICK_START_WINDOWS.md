# 🚀 Garçon App - Guida Rapida Windows

## Prerequisiti

### 1. Installa Node.js
- Vai su https://nodejs.org/
- Scarica la versione LTS
- Installa seguendo la procedura guidata

### 2. Installa Docker Desktop
- Vai su https://www.docker.com/products/docker-desktop/
- Scarica Docker Desktop per Windows
- Installa e avvia Docker Desktop

### 3. Verifica installazione
Apri PowerShell come amministratore e verifica:
```powershell
node --version
npm --version
docker --version
```

## Test Locale (5 minuti)

### 1. Setup Automatico
```powershell
# Esegui setup
PowerShell -ExecutionPolicy Bypass -File scripts/dev-setup.ps1
```

### 2. Avvia l'Applicazione
```powershell
# Avvia tutti i servizi
docker-compose -f docker-compose.dev.yml up
```

### 3. Testa l'API (in un nuovo terminale)
```powershell
# Test automatici
PowerShell -ExecutionPolicy Bypass -File scripts/test-api.ps1
```

### 4. Test Manuali
Apri il browser e vai su:
- 🌐 **API**: http://localhost:3000/health
- 📋 **API Info**: http://localhost:3000/api/v1

## Comandi Utili

```powershell
# Avvia solo database e Redis
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Avvia tutto
docker-compose -f docker-compose.dev.yml up

# Ferma tutto
docker-compose -f docker-compose.dev.yml down

# Vedi logs
docker-compose -f docker-compose.dev.yml logs -f

# Riavvia un servizio
docker-compose -f docker-compose.dev.yml restart backend
```

## Test con curl (alternativo)

Se hai curl installato:
```powershell
# Health check
curl http://localhost:3000/health

# API info
curl http://localhost:3000/api/v1

# Test registrazione
curl -X POST http://localhost:3000/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'
```

## Risoluzione Problemi

### Docker non si avvia
1. Assicurati che Docker Desktop sia avviato
2. Controlla che la virtualizzazione sia abilitata nel BIOS
3. Su Windows Home, assicurati di avere WSL2 installato

### Porte occupate
Se le porte 3000, 5432 o 6379 sono occupate:
```powershell
# Trova processi che usano la porta
netstat -ano | findstr :3000
# Termina il processo (sostituisci PID)
taskkill /PID <PID> /F
```

### Permessi PowerShell
Se hai errori di esecuzione policy:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Deploy Semplice

### Opzione 1: Heroku
1. Installa Heroku CLI da https://devcenter.heroku.com/articles/heroku-cli
2. Esegui:
```powershell
heroku login
heroku create garcon-app-demo
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini
git push heroku main
```

### Opzione 2: Railway
1. Vai su https://railway.app/
2. Connetti il repository GitHub
3. Aggiungi PostgreSQL e Redis
4. Deploy automatico

## Supporto

Se hai problemi:
1. Controlla che Docker Desktop sia avviato
2. Verifica che le porte non siano occupate
3. Controlla i logs: `docker-compose -f docker-compose.dev.yml logs`
4. Riavvia Docker Desktop se necessario