# Stage 1: Build Frontend (Vite + React)
FROM node:22-alpine AS build-web
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Build Backend (NestJS + TypeScript)
FROM node:22-alpine AS build-app
WORKDIR /app
COPY app/package*.json ./
RUN npm ci
COPY app/ ./
RUN npm run build

# Stage 3: Production Runtime (Serves both API and Static Web UI on port 3000)
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY app/package*.json ./
RUN npm ci --omit=dev
COPY --from=build-app /app/dist ./dist
COPY app/drizzle ./drizzle
COPY --from=build-web /web/dist ./public
EXPOSE 3000
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/db/seed.js && node dist/main.js"]
