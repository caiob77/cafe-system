# Cafe System

Sistema SaaS multi-tenant para operacao de cafes da manha: pedidos de mesa e delivery, cardapio, cozinha, caixa, relatorios e configuracoes do estabelecimento.

## Status

**Fase atual:** base SaaS operacional com cardapio, pedidos (balcao, mesa e
delivery, incluindo loja publica `/loja/[slug]`), cozinha, caixa, relatorios,
configuracoes e fluxo inicial de impressao. Isolamento multi-tenant em duas
camadas: handlers via `request.withTenant` + Row-Level Security no Postgres
(ver [Isolamento multi-tenant](#isolamento-multi-tenant-rls)).

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
│   ├── api/                 # API Fastify (Dockerfile multi-stage)
│   ├── web/                 # App Next.js (Dockerfile com output standalone)
│   └── print-agent/         # Agente local de impressao
├── packages/
│   ├── db/                  # Prisma schema, migrations, seed e client
│   └── shared/              # Tipos/schemas compartilhados
├── nginx/                   # nginx.conf, templates e bootstrap do Let's Encrypt
├── docs/tasks/              # Tarefas e regras de frontend (context-front.md)
├── docker-compose.yml       # Stack de dev (postgres + redis)
├── docker-compose.prod.yml  # Stack completa (api, web, nginx, certbot...)
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

4. Suba o docker compose de dev (Postgres e Redis):

```bash
docker compose up -d postgres redis
```

O `docker-compose.yml` de dev tem **só a infra** (Postgres em `5433`, Redis em
`6380` — portas alternativas para não conflitar com outras instâncias locais).
A API e o front rodam fora do Docker em dev, via `pnpm dev:api` / `pnpm dev:web`
(passo 9). Stack completa em container (api, web, nginx, certbot) só em
produção, via `docker-compose.prod.yml`.

```bash
docker compose ps       # ver status dos serviços
docker compose logs -f  # acompanhar logs
docker compose down     # para tudo (preserva os dados nos volumes)
docker compose down -v  # para tudo e APAGA os dados
```

Se as portas `5433`/`6380` já estiverem ocupadas por outro projeto, ajuste o
mapeamento em `docker-compose.yml` e o `DATABASE_URL`/`REDIS_URL` no `.env`.

5. Rode as migrations:

```bash
pnpm -F @cafe/db db:migrate
```

6. Aplique constraints, indices e policies de RLS (o Prisma nao emite isso
no `migrate`) e crie as roles do RLS:

```bash
pnpm -F @cafe/db db:post-migrate
pnpm -F @cafe/db db:roles
```

O `db:roles` cria `cafe_runtime` (sem `BYPASSRLS`, uso da API) e `cafe_admin`
(com `BYPASSRLS`, endpoints globais `/api/v1/admin/*`). As senhas vao em
`RUNTIME_DB_PASSWORD` e `ADMIN_DB_PASSWORD` no `.env` (ja presentes no
`.env.example`). Para ligar a fiscalizacao de fato, ver
[Isolamento multi-tenant](#isolamento-multi-tenant-rls).

7. Configure e popule dados iniciais:

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

8. Configure o `apps/print-agent/.env`:

```bash
cp apps/print-agent/.env.example apps/print-agent/.env
```

Em ambiente local, use:

```env
API_BASE_URL=http://localhost:3333
API_WS_URL=ws://localhost:3333/api/v1/realtime
PRINTER_TOKEN=pd_xxxxxxxxxxxxxxxxx
```

9. Suba o projeto:

```bash
pnpm dev:api
pnpm dev:web
```

Execute cada comando em um terminal separado. Use `pnpm dev` apenas quando quiser subir todos os apps via Turbo de uma vez.

URLs padrao:

- Web: http://localhost:3000
- API: http://localhost:3333
- Health check: http://localhost:3333/api/health
- Loja publica: http://localhost:3000/loja/<slug-da-organizacao>

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
pnpm -F @cafe/db db:migrate         # migrations (role owner/superuser)
pnpm -F @cafe/db db:post-migrate    # constraints, indices e policies RLS
pnpm -F @cafe/db db:roles           # cria cafe_runtime e cafe_admin
pnpm -F @cafe/db db:generate
pnpm -F @cafe/db db:seed
pnpm -F @cafe/db db:studio
pnpm -F @cafe/db db:migrate:deploy  # aplica migrations (deploy/prod)
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

## Isolamento multi-tenant (RLS)

O isolamento entre tenants tem duas camadas:

- **Aplicacao:** todos os handlers de dominio acessam tabelas tenant-bound via
  `request.withTenant(...)`, que fixa `app.current_org` na transacao.
- **Banco:** policies `tenant_isolation_*` (em
  `packages/db/prisma/sql/post-migrate.sql`, aplicadas via `db:post-migrate`)
  garantem o filtro mesmo que um handler novo esqueca o `organizationId`.

Duas roles, criadas via `pnpm -F @cafe/db db:roles`:

| Role | Uso | `BYPASSRLS` |
| --- | --- | --- |
| `cafe_runtime` | `DATABASE_URL` da API | nao |
| `cafe_admin` | `DATABASE_ADMIN_URL`, rotas `/api/v1/admin/*` | sim |

Enquanto `app.enable_rls` nao for `'on'`, as policies deixam tudo passar (modo
permissivo — util em dev). Para ligar:

```sql
ALTER DATABASE cafe SET app.enable_rls = 'on';
```

...e reinicie a API (o setting carrega em conexoes novas). Com o flag ligado, a
API **precisa** rodar como `cafe_runtime` (superuser/owner passa por cima do
RLS). Roteiro completo e smoke test em [docs/rls.md](./docs/rls.md).

## Pedido delivery publico

Clientes podem criar pedidos delivery sem acessar o painel interno pela rota:

```txt
/loja/[slug]
```

Exemplo local, usando o slug criado no seed:

```txt
http://localhost:3000/loja/cafe-beniel
```

Essa pagina nao exige login. Ela carrega o cardapio publico, permite selecionar
produtos e adicionais, montar carrinho, preencher dados de entrega e enviar o
pedido. Se o delivery estiver desativado, fechado pelo horario configurado ou o
bairro nao for atendido, o envio e bloqueado com mensagem clara.

Endpoints publicos da API:

```txt
GET  /api/v1/public/:slug/menu
GET  /api/v1/public/:slug/delivery-settings
POST /api/v1/public/:slug/orders
```

O `POST /api/v1/public/:slug/orders` espera:

```json
{
  "customer": {
    "name": "Nome do cliente",
    "phone": "92999999999",
    "address": "Rua Exemplo, 123",
    "neighborhood": "Centro",
    "reference": "Proximo a praca"
  },
  "items": [
    {
      "productId": "id-do-produto",
      "quantity": 1,
      "notes": "Sem cebola",
      "addons": [
        {
          "productAddonId": "id-do-adicional",
          "quantity": 1
        }
      ]
    }
  ],
  "notes": "Observacao geral",
  "idempotencyKey": "chave-unica-do-cliente"
}
```

O backend resolve a organizacao pelo `slug`, retorna apenas categorias ativas e
produtos/adicionais disponiveis, cria ou reutiliza o cliente pelo telefone e cria
um pedido `delivery` com status inicial `pending`. O pedido entra no mesmo fluxo
interno de delivery, publica evento realtime e gera o ticket de cozinha/print job
como os pedidos criados pelo painel.

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

## Producao (Docker)

A stack de producao vive em `docker-compose.prod.yml` e sobe: `postgres`,
`redis`, `api`, `web`, `nginx` (proxy + SSL) e `certbot` (renew automatico).

### Configuracao

1. Copie o template e preencha:

```bash
cp .env.production.example .env.production
```

Variaveis minimas:

```env
DOMAIN=cafe.seu-dominio.com
LETSENCRYPT_EMAIL=voce@seu-dominio.com

POSTGRES_USER=cafe
POSTGRES_PASSWORD=<senha-forte>
POSTGRES_DB=cafe

BETTER_AUTH_SECRET=<openssl rand -base64 48>
BETTER_AUTH_URL=https://cafe.seu-dominio.com
WEB_URL=https://cafe.seu-dominio.com
NEXT_PUBLIC_API_URL=https://cafe.seu-dominio.com

SUPER_ADMIN_EMAILS=voce@seu-dominio.com
PRO_PLAN_PRICE=99
```

### Build das imagens

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build
```

### Bootstrap do certificado SSL (primeiro deploy)

Aponte o DNS do `DOMAIN` para o IP da VPS antes desta etapa. Depois rode:

```bash
DOMAIN=cafe.seu-dominio.com \
LETSENCRYPT_EMAIL=voce@seu-dominio.com \
  ./nginx/init-letsencrypt.sh
```

O script cria um cert temporario, sobe o nginx, pede o cert real ao Let's
Encrypt via webroot e recarrega o nginx. Depois disso o servico `certbot`
renova automaticamente a cada 12h.

### Subir a stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### Migrations e seed inicial

```bash
# aplica migrations
docker compose -f docker-compose.prod.yml --env-file .env.production \
  exec api pnpm --filter @cafe/db exec prisma migrate deploy

# constraints, indices e policies RLS (os scripts db:post-migrate/db:roles
# usam o nome do container de dev; em prod canalize os SQL via stdin)
set -a && . ./.env.production && set +a
docker compose -f docker-compose.prod.yml --env-file .env.production \
  exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < packages/db/prisma/sql/post-migrate.sql
docker compose -f docker-compose.prod.yml --env-file .env.production \
  exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v runtime_pw="$RUNTIME_DB_PASSWORD" -v admin_pw="$ADMIN_DB_PASSWORD" \
  < packages/db/prisma/sql/init-roles.sql

# (opcional) roda o seed inicial — exige SEED_* no .env.production
docker compose -f docker-compose.prod.yml --env-file .env.production \
  exec api pnpm --filter @cafe/db db:seed
```

Depois, para ligar a fiscalizacao do RLS em producao, ver
[Isolamento multi-tenant](#isolamento-multi-tenant-rls) — e descomente o
`DATABASE_URL` da role `cafe_runtime` no `.env.production` antes de subir a API.

### Smoke test

```bash
curl https://cafe.seu-dominio.com/api/health
# { "status": "ok", "uptime": <segundos>, "db": "ok" }
```

### Operacao

```bash
# logs ao vivo
docker compose -f docker-compose.prod.yml logs -f api web nginx

# atualizar apenas a API apos um deploy
docker compose -f docker-compose.prod.yml --env-file .env.production \
  up -d --build api

# parar tudo (preserva volumes)
docker compose -f docker-compose.prod.yml --env-file .env.production down
```

> Backup do Postgres: o volume `postgres_backups` ja esta montado em
> `/backups` no container `cafe-postgres-prod`. Configurar um cron com
> `pg_dump` apontando para esse diretorio fica para o passo 10.2.

## Frontend

Ao alterar `apps/web`, siga o documento [context-front.md](./docs/tasks/context-front.md). Ele define a arquitetura obrigatoria para frontend:

- API via React Query.
- Estado global de UI via Redux Toolkit.
- Context para escopo de arvore e dados derivados da sessao.
- Componentes por dominio e containers em `features/[dominio]`.
- Pages finas no App Router.
