# ─── Stage 1: Install dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps
RUN npm install -g pnpm@9
WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/

# Install only production deps for the api workspace
RUN pnpm install --filter @booking/api --frozen-lockfile

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN npm install -g pnpm@9
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api ./apps/api

# Generate Prisma client and compile TypeScript
RUN cd apps/api && npx prisma generate
RUN pnpm --filter @booking/api build

# ─── Stage 3: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS production
# openssl required by Prisma on Alpine
RUN apk add --no-cache dumb-init openssl
WORKDIR /app

ENV NODE_ENV=production

# Keep monorepo structure so pnpm-hoisted packages (prisma CLI) are resolvable
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

# Create data directory and fix ownership before dropping to node user
RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 3001

WORKDIR /app/apps/api

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && dumb-init node dist/main"]
