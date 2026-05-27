-- ============================================================================
-- Café System — Constraints e índices que o Prisma não emite via migrate dev.
-- Rodar após `pnpm db:migrate dev --name init`.
--
-- Comando:
--   psql "$DATABASE_URL" -f packages/db/prisma/sql/post-migrate.sql
--
-- Idempotente: usa IF NOT EXISTS / DO blocks. Pode ser re-executado.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) Unique parcial: no máximo um caixa aberto por organização.
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS cash_register_one_open_per_org
  ON "cash_register" ("organizationId")
  WHERE "closedAt" IS NULL;


-- ----------------------------------------------------------------------------
-- 1b) Unique case-insensitive: evita "Centro" e "centro" como bairros distintos
--     na mesma organização. O @@unique do Prisma é case-sensitive.
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS delivery_fee_org_neighborhood_lower
  ON "delivery_fee" ("organizationId", LOWER("neighborhood"));


-- ----------------------------------------------------------------------------
-- 2) CHECK: total consistente quando o pedido está finalizado.
--    Antes de "finished", subtotal/total podem estar em construção e divergir.
--    A partir de "finished" tem de bater na conta.
--
--    total = subtotal
--          - COALESCE(discount, 0)
--          + COALESCE(service_charge, 0)
--          + COALESCE(tax, 0)
--          + COALESCE(delivery_fee, 0)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_total_consistency_when_finished'
  ) THEN
    ALTER TABLE "order"
      ADD CONSTRAINT order_total_consistency_when_finished
      CHECK (
        status <> 'finished'
        OR total = subtotal
                 - COALESCE("discountAmount", 0)
                 + COALESCE("serviceChargeAmount", 0)
                 + COALESCE("taxAmount", 0)
                 + COALESCE("deliveryFee", 0)
      );
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 3) CHECKs de não-negatividade em valores monetários.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_subtotal_nonneg') THEN
    ALTER TABLE "order" ADD CONSTRAINT order_subtotal_nonneg CHECK (subtotal >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_total_nonneg') THEN
    ALTER TABLE "order" ADD CONSTRAINT order_total_nonneg CHECK (total >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_delivery_fee_nonneg') THEN
    ALTER TABLE "order" ADD CONSTRAINT order_delivery_fee_nonneg
      CHECK ("deliveryFee" IS NULL OR "deliveryFee" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_discount_nonneg') THEN
    ALTER TABLE "order" ADD CONSTRAINT order_discount_nonneg
      CHECK ("discountAmount" IS NULL OR "discountAmount" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_service_charge_nonneg') THEN
    ALTER TABLE "order" ADD CONSTRAINT order_service_charge_nonneg
      CHECK ("serviceChargeAmount" IS NULL OR "serviceChargeAmount" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_tax_nonneg') THEN
    ALTER TABLE "order" ADD CONSTRAINT order_tax_nonneg
      CHECK ("taxAmount" IS NULL OR "taxAmount" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_amount_positive') THEN
    ALTER TABLE "payment" ADD CONSTRAINT payment_amount_positive CHECK (amount > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_change_nonneg') THEN
    ALTER TABLE "payment" ADD CONSTRAINT payment_change_nonneg
      CHECK ("changeAmount" IS NULL OR "changeAmount" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_item_quantity_positive') THEN
    ALTER TABLE "order_item" ADD CONSTRAINT order_item_quantity_positive CHECK (quantity > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_item_unit_price_nonneg') THEN
    ALTER TABLE "order_item" ADD CONSTRAINT order_item_unit_price_nonneg
      CHECK ("unitPrice" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_item_addon_quantity_positive') THEN
    ALTER TABLE "order_item_addon" ADD CONSTRAINT order_item_addon_quantity_positive
      CHECK (quantity > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_item_addon_unit_price_nonneg') THEN
    ALTER TABLE "order_item_addon" ADD CONSTRAINT order_item_addon_unit_price_nonneg
      CHECK ("unitPrice" >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_movement_amount_positive') THEN
    ALTER TABLE "cash_movement" ADD CONSTRAINT cash_movement_amount_positive
      CHECK (amount > 0);
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 4) CHECK: delivery exige customer.
--    Pedido tipo delivery não pode ficar sem cliente associado.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_delivery_requires_customer'
  ) THEN
    ALTER TABLE "order"
      ADD CONSTRAINT order_delivery_requires_customer
      CHECK (type <> 'delivery' OR "customerId" IS NOT NULL);
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 5) Índice parcial: pedidos ativos (KDS / dashboard).
--    O grosso dos pedidos vira histórico (finished/cancelled). O índice
--    parcial mantém o "ativo" pequeno e rápido mesmo com milhões de linhas.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS order_active_by_org
  ON "order" ("organizationId", status, "createdAt")
  WHERE status NOT IN ('finished', 'cancelled');


-- ============================================================================
-- 6) MULTI-TENANT — Row-Level Security (RLS).
-- ----------------------------------------------------------------------------
-- Esta seção é IDEMPOTENTE. Cria as policies em todos os ambientes, mas só
-- LIGA o RLS de fato quando a variável de sessão `app.enable_rls = on` está
-- presente (lida via current_setting, default = off). Assim a SQL pode rodar
-- antes do refator de handlers sem quebrar o app.
--
-- ATIVAR EM PRODUÇÃO:
--   1) Refatorar TODOS os handlers para usar `request.withTenant(async (db) => ...)`
--      em vez de `request.server.prisma.X` direto (ver docs/rls.md).
--   2) Garantir que a role de runtime do Postgres NÃO tem BYPASSRLS.
--   3) Setar `ALTER DATABASE cafe SET app.enable_rls = on;` (ou per-role).
--   4) Reciclar conexões (restart do API) — o setting é lido na conexão.
--
-- Bypass: roles com BYPASSRLS (ex: owner do banco para migrations). O usuário
-- de runtime da aplicação NÃO deve ter BYPASSRLS. Super admin do SaaS:
-- usar conexão separada com role BYPASSRLS ou setar app.current_org para
-- a org-alvo dentro de cada transação.
-- ============================================================================

-- ---- 6.1) Habilitar RLS nas tabelas tenant-bound (idempotente) ------------
ALTER TABLE "category"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_addon"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "table"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_item"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_item_addon"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_register"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_movement"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "print_job"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "delivery_fee"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "printer_device"    ENABLE ROW LEVEL SECURITY;


-- ---- 6.2) Policies — padrão tenant_isolation_<tabela> ---------------------
-- Cada policy combina:
--   - escape hatch: current_setting('app.enable_rls', true) <> 'on'
--     deixa o app funcionar sem refactor, e permite que migrations rodem
--     contra a role owner sem precisar setar app.current_org. Quando o flag
--     virar 'on' globalmente, o isolamento passa a ser obrigatório.
--   - USING: filtra leituras pelo organizationId == app.current_org.
--   - WITH CHECK: impede INSERT/UPDATE de "mover" linha para outra org.
--
-- DROP+CREATE para tornar idempotente. Custo de drop é desprezível.

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'category', 'product', 'product_addon', 'table', 'customer',
    'order', 'order_item', 'order_item_addon', 'payment',
    'cash_register', 'cash_movement', 'print_job', 'delivery_fee'
  ];
  policy_name text;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    policy_name := 'tenant_isolation_' || tbl;

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, tbl);

    EXECUTE format($f$
      CREATE POLICY %I ON %I
        USING (
          current_setting('app.enable_rls', true) IS DISTINCT FROM 'on'
          OR "organizationId" = current_setting('app.current_org', true)
        )
        WITH CHECK (
          current_setting('app.enable_rls', true) IS DISTINCT FROM 'on'
          OR "organizationId" = current_setting('app.current_org', true)
        )
    $f$, policy_name, tbl);
  END LOOP;
END $$;


-- ---- 6.3) printer_device — auth M2M sem sessão humana ---------------------
-- printer_device é consultado ANTES do tenantId ser resolvido (lookup por
-- tokenHash em resolvePrinterAuth). A policy precisa permitir esse lookup
-- mesmo sem app.current_org definido, mas só revelar dispositivos da org
-- correta quando o setting estiver presente.
DROP POLICY IF EXISTS tenant_isolation_printer_device ON "printer_device";
CREATE POLICY tenant_isolation_printer_device ON "printer_device"
  USING (
    current_setting('app.enable_rls', true) IS DISTINCT FROM 'on'
    OR current_setting('app.current_org', true) IS NULL
    OR current_setting('app.current_org', true) = ''
    OR "organizationId" = current_setting('app.current_org', true)
  )
  WITH CHECK (
    current_setting('app.enable_rls', true) IS DISTINCT FROM 'on'
    OR "organizationId" = current_setting('app.current_org', true)
  );
