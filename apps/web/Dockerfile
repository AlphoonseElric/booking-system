# ─── Stage 1: Install dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app/apps/web

# Use npm (not pnpm) so node_modules has real files, not pnpm symlinks.
# Next.js standalone requires real files to bundle deps correctly.
COPY apps/web/package.json ./
RUN npm install

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app/apps/web

COPY --from=deps /app/apps/web/node_modules ./node_modules
COPY apps/web ./

# Build args — injected at build time for NEXT_PUBLIC_ vars
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx next build

# ─── Stage 3: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS production
RUN apk add --no-cache dumb-init
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# standalone output has server.js at root + all deps bundled (npm, no symlinks)
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

# Create cache directory with proper permissions before switching to node user
RUN mkdir -p /app/.next/cache && \
    chown -R node:node /app && \
    chmod -R u+w /app

USER node
EXPOSE 3000

CMD ["dumb-init", "node", "server.js"]
