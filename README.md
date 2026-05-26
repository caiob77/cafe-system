# Cafe System

Sistema SaaS multi-tenant para operacao de cafes da manha: pedidos de mesa e delivery, cardapio, cozinha, caixa, relatorios e configuracoes do estabelecimento.

## Status

**Fase atual:** base SaaS operacional com cardapio, pedidos, cozinha, caixa,
relatorios, configuracoes e fluxo inicial de impressao.

O projeto ja possui monorepo, banco PostgreSQL com Prisma, API Fastify,
Better Auth com organizacoes, frontend Next.js protegido e print-agent local
autenticado por token de impressora.

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
│   └── print-agent/  # Agente local de impressao
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

Token seed do print-agent local:

```txt
PRINTER_TOKEN=pd_local_dev_4Yh3Kx9mN2pQ7vR8sT1uV5wXyZaBcDeFgHiJkLmNoPqRs
```

7. Configure o `apps/print-agent/.env`:

```bash
cp apps/print-agent/.env.example apps/print-agent/.env
```

Em ambiente local, use:

```env
API_BASE_URL=http://localhost:3333
API_WS_URL=ws://localhost:3333/api/v1/realtime
PRINTER_TOKEN=pd_local_dev_4Yh3Kx9mN2pQ7vR8sT1uV5wXyZaBcDeFgHiJkLmNoPqRs
```

8. Suba o projeto:

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

## Impressao

O `apps/print-agent` e o processo local que conecta na API, escuta eventos em
WebSocket e processa jobs de impressao. Enquanto nao houver impressora fisica,
ele simula a impressao no console.

Para rodar apenas o agente:

```bash
pnpm -F @cafe/print-agent dev
```

Quando conectado corretamente, o log esperado e:

```txt
[print-agent] conectado ao WS -- sincronizando fila inicial
```

### Autenticacao da impressora

Impressoras/agentes nao usam cookie de usuario. Eles usam um token proprio com
prefixo `pd_`, enviado em HTTP e no handshake WebSocket:

```http
Authorization: Bearer pd_xxxxxxxxxxxxxxxxx
```

O token plain e retornado uma unica vez na criacao da impressora. O banco guarda
somente o hash SHA-256 desse token.

Rotas de gestao de impressoras, acessiveis para `owner` ou `manager`:

```txt
GET    /api/v1/printer-devices
POST   /api/v1/printer-devices
DELETE /api/v1/printer-devices/:id
```

Exemplo para cadastrar uma impressora real:

```bash
curl -X POST http://localhost:3333/api/v1/printer-devices \
  -H 'Content-Type: application/json' \
  -H 'Cookie: better-auth.session_token=...' \
  -d '{"name":"Impressora Balcao"}'
```

Copie o `token` retornado para o `.env` da maquina onde o agente roda:

```env
PRINTER_TOKEN=pd_xxxxxxxxxxxxxxxxx
```

O token de impressora tem permissao estreita: pode conectar ao realtime e operar
jobs de impressao. Ele nao passa em rotas administrativas nem em rotas humanas
protegidas por role.

### Seguranca em producao

Em producao, configure obrigatoriamente TLS:

```env
API_BASE_URL=https://api.seu-dominio.com
API_WS_URL=wss://api.seu-dominio.com/api/v1/realtime
```

O print-agent aborta em `NODE_ENV=production` se `API_BASE_URL` nao usar
`https://` ou se `API_WS_URL` nao usar `wss://`.

Se um token vazar, revogue a impressora:

```bash
curl -X DELETE http://localhost:3333/api/v1/printer-devices/<id> \
  -H 'Cookie: better-auth.session_token=...'
```

## Frontend

Ao alterar `apps/web`, siga o documento [context-front.md](./context-front.md). Ele define a arquitetura obrigatoria para frontend:

- API via React Query.
- Estado global de UI via Redux Toolkit.
- Context para escopo de arvore e dados derivados da sessao.
- Componentes por dominio e containers em `features/[dominio]`.
- Pages finas no App Router.

