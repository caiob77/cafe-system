# Cafe System

Sistema SaaS multi-tenant para operacao de cafes da manha: pedidos de mesa e delivery, cardapio, cozinha, caixa, relatorios e configuracoes do estabelecimento.

## Status

**Fase atual:** Fase 1 concluida.

O projeto ja possui monorepo, banco PostgreSQL com Prisma, API Fastify, Better Auth com organizacoes e frontend Next.js com login, registro, dashboard protegido e logout.

Proxima fase planejada: **Fase 2 - Cardapio**, comecando pelo **Passo 2.1 - API de categorias**.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Monorepo | pnpm + Turborepo |
| Backend | Fastify + TypeScript |
| Auth | Better Auth + organization plugin |
| Frontend | Next.js 14 App Router + React 18 |
| UI | Tailwind CSS + componentes estilo shadcn/Radix/CVA |
| Estado servidor | TanStack React Query |
| Estado cliente | Redux Toolkit |
| Banco | PostgreSQL + Prisma |
| Validacao | Zod |
| Lint/format | Biome |
| Infra local | Docker Compose |

## Estrutura

```txt
cafe-system/
├── apps/
│   ├── api/          # API Fastify
│   ├── web/          # App Next.js
│   └── print-agent/  # Agente local de impressao futura
├── packages/
│   ├── db/           # Prisma schema, migrations, seed e client
│   └── shared/       # Tipos/schemas compartilhados
├── context-front.md  # Regras especificas para frontend
├── docker-compose.yml
└── package.json
```

## Requisitos

- Node.js >= 20
- pnpm 11.0.9
- Docker e Docker Compose

## Setup local

1. Instale as dependencias:

```bash
pnpm install
```

2. Crie o arquivo `.env`:

```bash
cp .env.example .env
```

3. Ajuste o segredo do Better Auth no `.env`:

```bash
openssl rand -hex 32
```

Use o valor gerado em `BETTER_AUTH_SECRET`.

4. Suba Postgres e Redis:

```bash
docker compose up -d postgres redis
```

5. Rode as migrations:

```bash
pnpm -F @cafe/db db:migrate
```

6. Popule dados iniciais:

```bash
pnpm -F @cafe/db db:seed
```

Usuario seed:

```txt
Email: owner@cafe.local
Senha: admin1234
```

7. Suba o projeto:

```bash
pnpm dev
```

URLs padrao:

- Web: http://localhost:3000
- API: http://localhost:3333
- Health check: http://localhost:3333/api/health

## Comandos

```bash
pnpm dev          # roda apps em modo dev via Turbo
pnpm build        # build dos pacotes/apps
pnpm typecheck    # typecheck do monorepo
pnpm lint         # Biome check
pnpm check        # Biome check --write
```

Comandos do banco:

```bash
pnpm -F @cafe/db db:migrate
pnpm -F @cafe/db db:generate
pnpm -F @cafe/db db:seed
pnpm -F @cafe/db db:studio
```

## Autenticacao

A API registra as rotas do Better Auth em:

```txt
/api/auth/*
```

Rotas auxiliares atuais:

```txt
GET /api/v1/auth/me
GET /api/v1/auth/owner-only
```

O frontend usa cookies de sessao do Better Auth e protege o dashboard via middleware.

## Frontend

Ao alterar `apps/web`, siga o documento [context-front.md](./context-front.md). Ele define a arquitetura obrigatoria para frontend:

- API via React Query.
- Estado global de UI via Redux Toolkit.
- Context para escopo de arvore e dados derivados da sessao.
- Componentes por dominio e containers em `features/[dominio]`.
- Pages finas no App Router.

## Checkpoint da Fase 1

Documento completo: [docs/checkpoints/fase-1.md](./docs/checkpoints/fase-1.md).

Fase 1 concluida com:

- Monorepo configurado com pnpm workspaces e Turborepo.
- Biome e tsconfig base configurados.
- Docker Compose com PostgreSQL e Redis.
- Prisma schema completo com migrations.
- Seed com tenant/organization, usuario owner, categorias, produtos e mesas.
- API Fastify com CORS, Helmet, Prisma plugin, error handler e health check.
- Better Auth integrado com Prisma adapter e organization plugin.
- Roles: `owner`, `manager`, `attendant`, `kitchen`.
- Hook de autenticacao injetando sessao, `tenantId` e `role`.
- Role guard no backend.
- App Next.js base com Tailwind, auth client, login, registro, dashboard protegido e logout.
- Providers base do frontend: React Query, Redux e contexto de sessao UI.

Validacoes realizadas:

```bash
pnpm typecheck
pnpm lint
pnpm -F @cafe/web build
```

Observacao: `pnpm lint` passa com warnings conhecidos no seed sobre non-null assertions.

## Commits sugeridos da Fase 1

```txt
feat: initialize cafe system foundation
feat: configure prisma schema and seed
feat: configure fastify api foundation
feat: configure better auth backend
feat: configure next auth frontend
docs: add phase 1 checkpoint
```
