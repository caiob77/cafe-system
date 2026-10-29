# Row-Level Security (RLS) - Estado e ativacao

O isolamento multi-tenant do dominio agora e garantido em duas camadas:

- handlers acessam tabelas tenant-bound por `request.withTenant(...)`;
- Postgres aplica policies RLS quando `app.enable_rls = 'on'`.

Mesmo que um handler novo esqueca o filtro `organizationId`, o banco so deve
devolver linhas da organizacao corrente quando a API estiver usando uma role
sem `BYPASSRLS`.

## Componentes entregues

1. **`withTenantTx(prisma, tenantId, fn)`** em `packages/db/src/index.ts` abre
   uma transacao interativa, faz `SET LOCAL app.current_org = '<id>'` e roda
   `fn(tx)`.

2. **`request.withTenant(fn)`** em `apps/api/src/plugins/prisma.ts` usa
   `request.tenantId` automaticamente. Todos os handlers de dominio que tocam
   tabelas tenant-bound usam esse caminho.

3. **Policies em `packages/db/prisma/sql/post-migrate.sql`** habilitam RLS nas
   tabelas tenant-bound e criam policy `tenant_isolation_<tabela>`. As policies
   tem escape hatch: enquanto `app.enable_rls` nao for `'on'`, deixam tudo
   passar.

4. **Super admin separado** em `apps/api/src/plugins/prisma.ts`: `app.prismaAdmin`
   usa `DATABASE_ADMIN_URL` com fallback para `DATABASE_URL`. Rotas
   `/api/v1/admin/*` usam `request.server.prismaAdmin`, pois atravessam
   organizacoes e nao tem tenant unico.

5. **Excecoes mantidas fora de `withTenant`**:
   - `apps/api/src/plugins/auth.ts`, porque resolve o tenant antes dele existir
     via `Member` e `PrinterDevice`.
   - consultas a `user`, `session`, `account`, `verification`, `member`,
     `invitation` e `organization`, que nao estao sob RLS.
   - `printer_device` tem policy especial para permitir lookup por token antes
     de `app.current_org` existir.

## Tabelas sob RLS

- `category`
- `product`
- `product_addon`
- `table`
- `customer`
- `order`
- `order_item`
- `order_item_addon`
- `payment`
- `cash_register`
- `cash_movement`
- `print_job`
- `delivery_fee`
- `printer_device`

## Ativacao em producao

### Passo 1 - Aplicar policies

```bash
pnpm -F @cafe/db db:post-migrate
```

Esse comando cria constraints, indices e policies. Antes do flag
`app.enable_rls = 'on'`, as policies continuam em modo permissivo.

### Passo 2 - Criar roles Postgres

Via script idempotente (funciona em banco já existente, pode re-executar):

```bash
# garanta RUNTIME_DB_PASSWORD e ADMIN_DB_PASSWORD no .env (ver .env.example)
pnpm -F @cafe/db db:roles
```

O script vive em `packages/db/prisma/sql/init-roles.sql`: cria `cafe_runtime`
(sem `BYPASSRLS`) e `cafe_admin` (com `BYPASSRLS`) via `DO` blocks, define as
senhas e aplica os grants. Equivalente manual (se preferir rodar na mão):

Crie uma role de runtime sem `BYPASSRLS`:

```sql
CREATE ROLE cafe_runtime LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE cafe TO cafe_runtime;
GRANT USAGE ON SCHEMA public TO cafe_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cafe_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cafe_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cafe_runtime;
```

Crie uma role admin com `BYPASSRLS` para endpoints globais:

```sql
CREATE ROLE cafe_admin LOGIN PASSWORD '...' BYPASSRLS;
GRANT CONNECT ON DATABASE cafe TO cafe_admin;
GRANT USAGE ON SCHEMA public TO cafe_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cafe_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cafe_admin;
```

Use a role runtime na API comum e a role admin na segunda conexao:

```env
DATABASE_URL=postgresql://cafe_runtime:...@postgres:5432/cafe?schema=public
DATABASE_ADMIN_URL=postgresql://cafe_admin:...@postgres:5432/cafe?schema=public
```

Migrations devem continuar rodando com a role owner/superuser, nao com
`cafe_runtime`.

### Passo 3 - Ligar o flag

```sql
ALTER DATABASE cafe SET app.enable_rls = 'on';
```

Depois recicle conexoes com restart da API. O setting e carregado em conexoes
novas.

> Executado em 2026-10-28 (banco de smoke local, `ALTER DATABASE cafe SET
> app.enable_rls = 'on'`): `cafe_runtime` sem contexto → 0 linhas;
> `cafe_admin` → todas; com `SET LOCAL app.current_org` → só linhas da org;
> `UPDATE` cross-org bloqueado (`new row violates row-level security policy`).
> API rodada como `cafe_runtime` passou no smoke (menu, pedido público 201,
> retry idempotente 200, 422/404/409 nos ramos de erro, leitura autenticada).

### Passo 4 - Smoke test

- `GET /api/v1/categories` autenticado em org A deve retornar apenas dados da
  org A.
- Em psql como `cafe_runtime`, sem `SET LOCAL app.current_org`, `SELECT * FROM
  "category";` deve retornar 0 linhas.
- Em psql como `cafe_admin`, a mesma query deve retornar todas as linhas.
- Como `cafe_runtime` dentro de uma transacao com `SET LOCAL app.current_org =
  '<org-a>'`, tentar `UPDATE "category" SET "organizationId" = '<org-b>'` deve
  ser bloqueado pelo `WITH CHECK`.

## Reverter

Se algo der errado depois de ligar:

```sql
ALTER DATABASE cafe SET app.enable_rls = 'off';
-- reciclar conexoes
```

As policies continuam existindo, mas viram no-op pelo escape hatch.

Para remover completamente, gere os `DROP POLICY` e desabilite RLS por tabela:

```sql
SELECT format('DROP POLICY %I ON %I;', policyname, tablename)
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'tenant_isolation_%';

ALTER TABLE "category" DISABLE ROW LEVEL SECURITY;
```

Repita o `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` para as demais tabelas.
