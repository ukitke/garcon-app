# Simple single-stage build for Railway
FROM node:18-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files first for better caching
COPY packages/backend/package*.json ./packages/backend/

# Install dependencies
RUN cd packages/backend && npm ci --only=production && npm cache clean --force

# Copy source code
COPY packages/backend/src ./packages/backend/src

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S garcon -u 1001

# Change ownership of the app directory
RUN chown -R garcon:nodejs /app
USER garcon

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "packages/backend/src/index-railway-full.js"]