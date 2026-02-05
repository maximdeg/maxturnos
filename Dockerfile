# syntax=docker.io/docker/dockerfile:1
# Multi-stage build for MaxTurnos (Next.js standalone)
# See: https://nextjs.org/docs/app/api-reference/next-config-js/output
# Example: https://github.com/vercel/next.js/tree/canary/examples/with-docker

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# libc6-compat for Alpine: required by some Node native modules
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# OCI image labels (optional, for image metadata)
LABEL org.opencontainers.image.title="MaxTurnos" \
      org.opencontainers.image.description="Sistema de reserva de turnos médicos multi-proveedor"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Standalone output: minimal server + traced dependencies
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Runtime data read by API (e.g. health-insurance from data/obras-sociales.json)
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is emitted by next build when output: 'standalone'
CMD ["node", "server.js"]
