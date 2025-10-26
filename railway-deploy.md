# 🚀 Deploy su Railway (5 minuti)

## Passo 1: Prepara il Progetto

Crea questi file per Railway:

### 1. Dockerfile per Railway
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copia package files
COPY packages/backend/package*.json ./
RUN npm install --production

# Copia codice
COPY packages/backend/src ./src
COPY packages/backend/tsconfig.json ./

# Installa ts-node globalmente
RUN npm install -g ts-node typescript

EXPOSE 3000

CMD ["ts-node", "src/index-simple.ts"]
```

### 2. railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "dockerfile"
  },
  "deploy": {
    "startCommand": "ts-node src/index-simple.ts",
    "healthcheckPath": "/health"
  }
}
```

## Passo 2: Deploy

1. **Vai su https://railway.app/**
2. **Clicca "Start a New Project"**
3. **Connetti GitHub** (o carica i file)
4. **Seleziona il repository**
5. **Railway rileva automaticamente** il Dockerfile
6. **Deploy automatico!**

## Passo 3: Configura Variabili

Nel dashboard Railway, aggiungi:
- `NODE_ENV=production`
- `PORT=3000`
- `DISABLE_MONITORING=true`

## Risultato

In 5 minuti avrai:
- ✅ App online su https://your-app.railway.app
- ✅ HTTPS automatico
- ✅ Deploy automatico ad ogni push
- ✅ Logs in tempo reale