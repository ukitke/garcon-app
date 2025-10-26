FROM node:18-alpine

WORKDIR /app

# Installa dipendenze di sistema
RUN apk add --no-cache curl

# Copia package files del backend
COPY packages/backend/package*.json ./

# Installa dipendenze
RUN npm install --production

# Installa ts-node e typescript globalmente
RUN npm install -g ts-node typescript

# Copia codice sorgente del backend
COPY packages/backend/src ./src

# Esponi porta
EXPOSE 3000

# Health check - più permissivo per Railway
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Avvia applicazione
CMD ["ts-node", "src/index-railway.ts"]