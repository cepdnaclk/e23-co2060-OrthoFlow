FROM node:24-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS frontend
COPY code/frontend/package*.json ./code/frontend/
RUN npm ci --include=dev --prefix code/frontend
COPY code/frontend/ ./code/frontend/
COPY code/shared/ ./code/shared/
RUN npm run build --prefix code/frontend

FROM base AS backend
COPY code/backend/package*.json ./code/backend/
COPY code/backend/prisma/ ./code/backend/prisma/
RUN npm ci --include=dev --prefix code/backend && npm run db:generate --prefix code/backend

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=backend /app/code/backend/ ./code/backend/
COPY code/backend/src/ ./code/backend/src/
COPY code/shared/ ./code/shared/
COPY --from=frontend /app/code/frontend/dist/ ./code/frontend/dist/
USER node
EXPOSE 8080
CMD ["sh", "-c", "npm run db:deploy --prefix code/backend && exec node code/backend/src/server.js"]

