# syntax=docker/dockerfile:1

# ── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Upgrade npm to match the version used locally to generate the lockfile
RUN npm install -g npm@12

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate --config prisma7.config.ts
RUN npm run build

# ── Stage 3: migrate (one-shot; includes prisma devDep) ──────────────────────
FROM node:22-alpine AS migrate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY prisma7.config.ts ./
COPY prisma ./prisma
COPY generated ./generated

CMD ["npx", "prisma", "migrate", "deploy", "--config", "prisma7.config.ts"]

# ── Stage 4: runner ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

# Upgrade npm before running ci
RUN npm install -g npm@12

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production

USER app

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health/live || exit 1

CMD ["node", "dist/src/main.js"]
