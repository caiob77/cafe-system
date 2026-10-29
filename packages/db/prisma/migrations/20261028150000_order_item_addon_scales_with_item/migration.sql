-- Linhas existentes mantêm a conta antiga (quantity já é o total do adicional).
ALTER TABLE "order_item_addon" ADD COLUMN "scalesWithItem" BOOLEAN NOT NULL DEFAULT false;

-- Linhas novas passam a gravar a quantidade por unidade do item.
ALTER TABLE "order_item_addon" ALTER COLUMN "scalesWithItem" SET DEFAULT true;
