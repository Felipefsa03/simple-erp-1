# ============================================
# LuminaFlow ERP - Multi-stage Dockerfile
# ============================================

# ---- Stage 1: Dependencies ----
FROM node:18-alpine AS deps
WORKDIR /app

# Copy package files
COPY simple-erp/package.json simple-erp/package-lock.json* ./
COPY simple-erp/frontend/package.json simple-erp/frontend/package-lock.json* ./frontend/

# Install dependencies
RUN npm ci --prefix simple-erp && \
    npm ci --prefix simple-erp/frontend

# ---- Stage 2: Builder ----
FROM node:18-alpine AS builder
WORKDIR /app

COPY --from=deps /app/simple-erp/node_modules ./simple-erp/node_modules
COPY --from=deps /app/simple-erp/frontend/node_modules ./simple-erp/frontend/node_modules
COPY simple-erp/ ./simple-erp/

# Build frontend
RUN npm run build:frontend --prefix simple-erp

# ---- Stage 3: Production ----
FROM node:18-alpine AS production
WORKDIR /app

# Install production dependencies only
RUN npm ci --prefix simple-erp --omit=dev

# Copy built artifacts
COPY --from=builder /app/simple-erp/frontend/dist ./simple-erp/frontend/dist
COPY --from=builder /app/simple-erp/backend ./simple-erp/backend
COPY --from=builder /app/simple-erp/package.json ./simple-erp/package.json

# Copy environment files
COPY simple-erp/.env.example .env.local

# Expose ports
# Frontend: 3000
# Backend API: 8787
EXPOSE 3000 8787

# Start script
CMD ["node", "simple-erp/backend/server.mjs"]
