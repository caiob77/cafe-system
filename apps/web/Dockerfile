# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# Base com pnpm.
# -----------------------------------------------------------------------------
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@11.0.9 --activate

# -----------------------------------------------------------------------------
# Stage 1 — instala dependências do monorepo.
# -----------------------------------------------------------------------------
FROM base AS deps
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/print-agent/package.json ./apps/print-agent/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/shared/package.json ./packages/shared/package.json
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 2 — build do Next.js (output standalone).
# -----------------------------------------------------------------------------
FROM deps AS builder
WORKDIR /repo
ARG NEXT_PUBLIC_API_URL=http://localhost:3333
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
COPY tsconfig.base.json ./tsconfig.base.json
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm --filter @cafe/web build

# -----------------------------------------------------------------------------
# Stage 3 — runtime mínimo com o output standalone.
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
