# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY packages/backend ./packages/backend
COPY tsconfig.json ./

# Build the application
RUN npm run build --workspace=packages/backend

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 garcon

# Copy built application
COPY --from=builder --chown=garcon:nodejs /app/packages/backend/dist ./dist
COPY --from=deps --chown=garcon:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=garcon:nodejs /app/packages/backend/node_modules ./packages/backend/node_modules

# Copy package.json for runtime
COPY --chown=garcon:nodejs packages/backend/package*.json ./

# Install curl for health checks
RUN apk add --no-cache curl

USER garcon

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/app.js"]