# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# Base com pnpm + ferramentas nativas necessárias (openssl p/ Prisma).
# -----------------------------------------------------------------------------
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@11.0.9 --activate
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

# -----------------------------------------------------------------------------
# Stage 1 — instala node_modules do monorepo a partir dos package.json.
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
# Stage 2 — gera Prisma Client e roda typecheck para garantir build válido.
# -----------------------------------------------------------------------------
FROM deps AS builder
WORKDIR /repo
COPY tsconfig.base.json ./tsconfig.base.json
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @cafe/db exec prisma generate
RUN pnpm --filter @cafe/api typecheck

# -----------------------------------------------------------------------------
# Stage 3 — runtime: roda src com tsx (workspace packages são TS puro).
# -----------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=3333

COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json /repo/pnpm-workspace.yaml /repo/.npmrc ./
COPY --from=builder /repo/tsconfig.base.json ./tsconfig.base.json
COPY --from=builder /repo/packages ./packages
COPY --from=builder /repo/apps/api ./apps/api

WORKDIR /app/apps/api
EXPOSE 3333

# Executa via tsx (pacotes do workspace `@cafe/db` e `@cafe/shared` são TS puro).
CMD ["node", "--import", "tsx", "src/server.ts"]
