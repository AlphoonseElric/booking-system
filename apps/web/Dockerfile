# ─── Stage 1: Install dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps
RUN npm install -g pnpm@9
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/

RUN pnpm install --filter @booking/web --frozen-lockfile

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN npm install -g pnpm@9
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/web ./apps/web

# Build args — injected at build time for NEXT_PUBLIC_ vars
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Disable Next.js telemetry in CI
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @booking/web build

# ─── Stage 3: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS production
RUN apk add --no-cache dumb-init
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone output (contains server.js + .next/server)
COPY --from=builder /app/apps/web/.next/standalone ./
# Overwrite with full builder node_modules so pnpm symlinks resolve correctly
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

USER node
EXPOSE 3000

CMD ["dumb-init", "node", "server.js"]
