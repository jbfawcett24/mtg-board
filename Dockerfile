FROM node:20-alpine AS builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm install

COPY client/ ./
RUN npm run build

# --- Stage 2 ---
FROM node:20-alpine
WORKDIR /app/server

COPY server/package*.json ./
RUN npm install

COPY server/ ./

COPY --from=builder /app/client/dist /app/client/dist
EXPOSE 3001
CMD ["node", "index.js"]