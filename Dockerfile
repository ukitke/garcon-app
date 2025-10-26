FROM node:18-alpine

WORKDIR /app

# Installa dipendenze di sistema
RUN apk add --no-cache curl

# Copia package files del backend
COPY packages/backend/package*.json ./

# Installa dipendenze
RUN npm install --production

# Copia solo il file JavaScript diretto
COPY packages/backend/src/index-railway-direct.js ./src/

# Esponi porta
EXPOSE 3000

# Health check - più permissivo per Railway
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Avvia direttamente con Node.js
CMD ["node", "src/index-railway-direct.js"]