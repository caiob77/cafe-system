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

6. Configure e popule dados iniciais:

O seed atual foi preparado para iniciar uma base real em modelo multi-tenant.
Ele cria o primeiro cliente/tenant da plataforma. No seu caso, esse primeiro
tenant e o Cafe Beniel.

Ele cria:

- 1 organizacao/tenant.
- 1 usuario owner.
- Catalogo inicial com categorias e produtos, se `SEED_LOAD_INITIAL_CATALOG=true`.
- Mesas.
- Configuracao basica de delivery.
- Impressora/agente inicial com token proprio.

Atencao: o seed apaga os dados existentes antes de recriar a base. Por isso ele
so roda quando `SEED_CONFIRM_RESET=true` estiver definido.

No `.env`, preencha pelo menos:

```env
SEED_CONFIRM_RESET=true
SEED_OWNER_EMAIL=seu@email.com
SEED_OWNER_PASSWORD=uma-senha-forte-com-12-ou-mais
SEED_OWNER_NAME=Seu Nome
SEED_ORG_NAME="Nome Da Empresa"
SEED_ORG_SLUG="Nome-Da-Empresa"
SEED_ORG_PHONE="(92) 99999-9999"
SEED_ORG_ADDRESS="Rua, numero - Bairro - CEP"
SEED_TABLE_COUNT=10
SEED_DELIVERY_ENABLED=true
SEED_DEFAULT_DELIVERY_FEE=0.00
SEED_LOAD_INITIAL_CATALOG=true
```

Use `SEED_LOAD_INITIAL_CATALOG=true` para carregar o cardapio inicial do
primeiro tenant. Para clientes futuros do SaaS, o fluxo correto e criar o tenant
pelo onboarding/front e cadastrar categorias/produtos pela tela de Cardapio.
Se quiser rodar o seed sem produtos, use `SEED_LOAD_INITIAL_CATALOG=false`.

Para taxas por bairro, use o formato `Bairro:valor`, separando varios bairros
por ponto e virgula:

```env
SEED_DELIVERY_FEES="Centro:5.00;Cidade Nova:7.00;Flores:8.00"
```

O token da impressora pode ser gerado automaticamente. Deixe vazio:

```env
SEED_PRINTER_NAME="Impressora principal"
SEED_PRINTER_TOKEN=
```

Depois rode:

```bash
pnpm -F @cafe/db db:seed
```

Ao final, o terminal mostra o `PRINTER_TOKEN` gerado. Guarde esse valor e use no
`apps/print-agent/.env`. O banco guarda somente o hash, entao o token plain nao
pode ser recuperado depois.

Exemplo de saida:

```txt
Seed concluido!
  Org: Cafe Beniel (slug: cafe-beniel)
  Owner: seu@email.com
  Categorias: 5
  Produtos: 72
  Mesas: 10
  Taxas de bairro: 3

  Print agent:
    PRINTER_TOKEN=pd_xxxxxxxxxxxxxxxxx
```

Se preferir definir um token fixo, preencha `SEED_PRINTER_TOKEN` antes de rodar
o seed. Use um valor longo com prefixo `pd_`:

```env
SEED_PRINTER_TOKEN=pd_token_longo_gerado_com_seguranca
```

7. Configure o `apps/print-agent/.env`:

```bash
cp apps/print-agent/.env.example apps/print-agent/.env
```

Em ambiente local, use:

```env
API_BASE_URL=http://localhost:3333
API_WS_URL=ws://localhost:3333/api/v1/realtime
PRINTER_TOKEN=pd_xxxxxxxxxxxxxxxxx
```

8. Suba o projeto:

```bash
pnpm dev:api
pnpm dev:web
```

Execute cada comando em um terminal separado. Use `pnpm dev` apenas quando quiser subir todos os apps via Turbo de uma vez.

URLs padrao:

- Web: http://localhost:3000
- API: http://localhost:3333
- Health check: http://localhost:3333/api/health

## Comandos

```bash
pnpm dev          # roda todos os apps em modo dev via Turbo
pnpm dev:api      # roda apenas a API em http://localhost:3333
pnpm dev:web      # roda apenas o frontend em http://localhost:3000
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
