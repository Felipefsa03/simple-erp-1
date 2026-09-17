FROM node:18-alpine AS production
WORKDIR /app

# Install curl for keep-alive cron job
RUN apk add --no-cache curl

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY server/ ./server/
COPY scripts/ ./scripts/
COPY package.json ./package.json

CMD ["npm", "start"]
