# Multi-stage build for Garçon Backend
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY packages/backend/package*.json ./packages/backend/
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN cd packages/backend && npm ci

# Copy source code
COPY packages/backend ./packages/backend

# Build TypeScript (if needed)
RUN cd packages/backend && npm run build || echo "No build script found, using source directly"

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY packages/backend/package*.json ./packages/backend/

# Install only production dependencies
RUN cd packages/backend && npm ci --only=production && npm cache clean --force

# Copy built application or source code
COPY --from=builder /app/packages/backend/src ./packages/backend/src
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist 2>/dev/null || echo "No dist folder found"

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