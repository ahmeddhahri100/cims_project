# Builder stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm prune --production

# Production stage
FROM node:22-alpine AS production

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

EXPOSE 3001

CMD ["node", "server.js"]
