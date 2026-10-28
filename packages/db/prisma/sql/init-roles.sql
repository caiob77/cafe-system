-- ============================================================================
-- Café System — Roles Postgres para o RLS (`cafe_runtime` / `cafe_admin`).
--
-- Comando (senhas via ambiente, ver `db:roles` em packages/db/package.json):
--   pnpm -F @cafe/db db:roles
--
-- Idempotente: usa DO blocks + GRANT (re-execução é no-op). Pode rodar em banco
-- já existente — não depende de volume fresh do docker-compose.
-- As senhas chegam como variáveis psql (`-v runtime_pw=... -v admin_pw=...`).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Role de runtime: sem BYPASSRLS (o RLS vale para ela).
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cafe_runtime') THEN
    CREATE ROLE cafe_runtime LOGIN;
  END IF;
END $$;

ALTER ROLE cafe_runtime WITH LOGIN PASSWORD :'runtime_pw';
ALTER ROLE cafe_runtime NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

-- ----------------------------------------------------------------------------
-- 2) Role admin: com BYPASSRLS (endpoints globais `/api/v1/admin/*`).
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cafe_admin') THEN
    CREATE ROLE cafe_admin LOGIN;
  END IF;
END $$;

ALTER ROLE cafe_admin WITH LOGIN PASSWORD :'admin_pw';
ALTER ROLE cafe_admin NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;

-- ----------------------------------------------------------------------------
-- 3) Grants (re-executar GRANT é no-op, então sem DO block).
-- ----------------------------------------------------------------------------
GRANT CONNECT ON DATABASE cafe TO cafe_runtime, cafe_admin;
GRANT USAGE ON SCHEMA public TO cafe_runtime, cafe_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cafe_runtime, cafe_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cafe_runtime, cafe_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cafe_runtime, cafe_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO cafe_runtime, cafe_admin;
