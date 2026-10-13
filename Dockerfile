# Multi-stage Docker build for NFSU Placement Portal
# Stage 1: Build the React client
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production Node server
FROM node:22-alpine
WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev

COPY server/ ./
# Copy built client static assets into server dist directory
COPY --from=client-builder /app/client/dist /app/client/dist

# Set production environment and run seed
ENV NODE_ENV=production
ENV PORT=5000

# Seed database on build or entry
RUN npm run seed

EXPOSE 5000

CMD ["node", "src/server.js"]
