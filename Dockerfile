# ─── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ─── Stage 2: build Next.js ────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined at build time.
# The browser connects to PartyKit directly, so this must be the host-visible address.
ARG NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999
ENV NEXT_PUBLIC_PARTYKIT_HOST=$NEXT_PUBLIC_PARTYKIT_HOST

RUN npm run build

# ─── Stage 3: production Next.js runner ────────────────────────────────────────
FROM node:20-alpine AS nextjs
WORKDIR /app

ENV NODE_ENV=production

# Only copy what next start needs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]

# ─── Stage 4: PartyKit dev server ──────────────────────────────────────────────
FROM node:20-alpine AS partykit
WORKDIR /app

# PartyKit dev needs the full source + node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 1999
CMD ["node_modules/.bin/partykit", "dev", "--port", "1999"]
