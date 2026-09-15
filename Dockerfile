# ============================================
# LuminaFlow ERP - Multi-stage Dockerfile
# ============================================

# ---- Stage 1: Dependencies ----
FROM node:18-alpine AS deps
WORKDIR /app

# Copy package files from the canonical root application.
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# ---- Stage 2: Builder ----
FROM node:18-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . ./

# Build frontend
RUN npm run build

# ---- Stage 3: Production ----
FROM node:18-alpine AS production
WORKDIR /app

# Reuse the lockfile-resolved dependency tree and remove development-only
# packages in the production image.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
RUN npm prune --omit=dev

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json ./package.json

# Copy environment files
COPY .env.example .env.local

# Expose ports
# Frontend: 3000
# Backend API: 8787
EXPOSE 3000 8787

# Start script
CMD ["node", "server/index.js"]
