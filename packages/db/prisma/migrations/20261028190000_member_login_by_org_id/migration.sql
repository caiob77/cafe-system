-- Quem abriu/fechou caixa, lançou movimento ou cancelou pedido pode ser apagado
-- (membro removido do café). O id vira NULL e o nome fica gravado em *ByName.
ALTER TABLE "cash_register"
  ADD COLUMN "openedByName" TEXT,
  ADD COLUMN "closedByName" TEXT,
  ALTER COLUMN "openedById" DROP NOT NULL;
ALTER TABLE "cash_register" DROP CONSTRAINT "cash_register_openedById_fkey";
ALTER TABLE "cash_register" ADD CONSTRAINT "cash_register_openedById_fkey"
  FOREIGN KEY ("openedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cash_movement"
  ADD COLUMN "createdByName" TEXT,
  ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "cash_movement" DROP CONSTRAINT "cash_movement_createdById_fkey";
ALTER TABLE "cash_movement" ADD CONSTRAINT "cash_movement_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order" ADD COLUMN "cancelledByName" TEXT;

-- Contas da equipe: o e-mail interno deixa de usar o slug e passa a usar o id do café
-- (usuario@<id>.membros.cafe.local). O login digitado continua usuario@slug.
UPDATE "user" u
SET "email" = lower(split_part(u."email", '@', 1) || '@' || m."organizationId" || '.membros.cafe.local')
FROM "member" m
WHERE m."userId" = u."id"
  AND u."email" LIKE '%.membros.cafe.local'
  AND (SELECT count(*) FROM "member" x WHERE x."userId" = u."id") = 1;

-- Membros já removidos (conta da equipe sem café) são apagados, guardando o nome antes.
CREATE TEMP TABLE "removed_member_user" AS
SELECT u."id", u."name"
FROM "user" u
WHERE u."email" LIKE '%.membros.cafe.local'
  AND NOT EXISTS (SELECT 1 FROM "member" m WHERE m."userId" = u."id");

UPDATE "cash_register" c SET "openedByName" = r."name"
FROM "removed_member_user" r WHERE c."openedById" = r."id";
UPDATE "cash_register" c SET "closedByName" = r."name"
FROM "removed_member_user" r WHERE c."closedById" = r."id";
UPDATE "cash_movement" c SET "createdByName" = r."name"
FROM "removed_member_user" r WHERE c."createdById" = r."id";
UPDATE "order" o SET "cancelledByName" = r."name"
FROM "removed_member_user" r WHERE o."cancelledById" = r."id";

DELETE FROM "user" u USING "removed_member_user" r WHERE u."id" = r."id";

DROP TABLE "removed_member_user";
