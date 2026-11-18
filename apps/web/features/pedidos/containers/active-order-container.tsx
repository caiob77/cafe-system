'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ItemEditorDialog } from '@/components/pedidos/item-editor-dialog';
import { MenuPicker } from '@/components/pedidos/menu-picker';
import { OrderStatusControls } from '@/components/pedidos/order-status-controls';
import { OrderSummary } from '@/components/pedidos/order-summary';
import { SettleOrderDialog } from '@/components/pedidos/settle-order-dialog';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ApiError } from '@/lib/api-client';

import { useCategories } from '@/features/cardapio/api/use-categories';
import { useProducts } from '@/features/cardapio/api/use-products';
import type { Product } from '@/features/cardapio/types';
import {
  useAddOrderItem,
  useOrder,
  useRemoveOrderItem,
  useUpdateOrderStatus,
} from '@/features/pedidos/api/use-orders';
import type { DraftOrderItem, Order, OrderStatus } from '@/features/pedidos/types';
import { canModifyOrderItems } from '@/features/pedidos/utils/editing';
import { shouldSettleOnAdvance } from '@/features/pedidos/utils/settlement';

type ActiveOrderContainerProps = {
  orderId: string;
};

type EditorState = { open: false } | { open: true; productId: string };

function describeItemsError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'order_not_open') {
      return 'Este pedido já entrou em preparo e não aceita mais alterações.';
    }
    if (err.code === 'order_last_item') {
      return 'Cancele o pedido em vez de remover o último item.';
    }
    if (err.code === 'order_version_mismatch') {
      return 'O pedido foi atualizado em outra tela. Dados recarregados — tente de novo.';
    }
    return err.message;
  }
  return 'Não foi possível alterar os itens do pedido.';
}

export function ActiveOrderContainer({ orderId }: ActiveOrderContainerProps) {
  const { confirm, prompt } = useConfirm();
  const orderQuery = useOrder(orderId);
  const updateStatus = useUpdateOrderStatus();
  const addItem = useAddOrderItem();
  const removeItem = useRemoveOrderItem();

  const categoriesQuery = useCategories();
  const productsQuery = useProducts();

  const [actionError, setActionError] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<Order | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const order = orderQuery.data ?? null;
  const editable = order ? canModifyOrderItems(order.status) : false;
  const itemsPending = addItem.isPending || removeItem.isPending;

  const visibleCategories = useMemo(
    () => (categoriesQuery.data ?? []).filter((category) => category.active),
    [categoriesQuery.data],
  );

  useEffect(() => {
    if (!pickerOpen) return;
    if (visibleCategories.length === 0) {
      if (selectedCategoryId !== null) setSelectedCategoryId(null);
      return;
    }
    const stillExists = visibleCategories.some((c) => c.id === selectedCategoryId);
    if (!stillExists) {
      const first = visibleCategories[0];
      if (first) setSelectedCategoryId(first.id);
    }
  }, [pickerOpen, visibleCategories, selectedCategoryId]);

  // No celular o seletor abre abaixo da lista de itens: leva o usuário até ele.
  useEffect(() => {
    if (!pickerOpen) return;
    pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [pickerOpen]);

  async function handleAdvance(next: OrderStatus) {
    if (!orderQuery.data) return;
    if (shouldSettleOnAdvance(orderQuery.data.type, next)) {
      setActionError(null);
      setSettlement(orderQuery.data);
      return;
    }
    setActionError(null);
    try {
      await updateStatus.mutateAsync({
        id: orderId,
        status: next,
        version: orderQuery.data.version,
      });
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : 'Não foi possível atualizar o status.',
      );
    }
  }

  async function handleCancel() {
    if (!orderQuery.data) return;
    const reason = await prompt({
      title: `Cancelar pedido #${orderQuery.data.dailyNumber}?`,
      description: 'Informe o motivo. Ele fica registrado no pedido.',
      label: 'Motivo do cancelamento',
      placeholder: 'Ex.: cliente desistiu, item em falta…',
      minLength: 2,
      maxLength: 280,
      confirmLabel: 'Cancelar pedido',
      cancelLabel: 'Manter pedido',
      destructive: true,
    });
    if (!reason) return;
    setActionError(null);
    try {
      await updateStatus.mutateAsync({
        id: orderId,
        status: 'cancelled',
        version: orderQuery.data.version,
        cancelReason: reason.trim(),
      });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível cancelar o pedido.');
    }
  }

  function handleSelectProduct(product: Product) {
    setEditor({ open: true, productId: product.id });
  }

  async function handleEditorConfirm(draft: DraftOrderItem) {
    if (!orderQuery.data) return;
    setActionError(null);
    try {
      await addItem.mutateAsync({
        id: orderId,
        productId: draft.productId,
        quantity: draft.quantity,
        notes: draft.notes ?? undefined,
        addons: draft.addons.map((addon) => ({
          productAddonId: addon.productAddonId,
          quantity: addon.quantity,
        })),
      });
      setEditor({ open: false });
      setPickerOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'order_version_mismatch') {
        void orderQuery.refetch();
      }
      setActionError(describeItemsError(err));
    }
  }

  async function handleRemoveItem(itemId: string) {
    if (!orderQuery.data) return;
    const ok = await confirm({
      title: 'Remover item do pedido?',
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!ok) return;
    setActionError(null);
    try {
      await removeItem.mutateAsync({ id: orderId, itemId });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'order_version_mismatch') {
        void orderQuery.refetch();
      }
      setActionError(describeItemsError(err));
    }
  }

  if (orderQuery.isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 py-12 text-center">
        <p className="text-sm text-muted-foreground">Pedido não encontrado.</p>
        <Button asChild type="button" variant="ghost">
          <Link href="/mesas">
            <ArrowLeft className="h-4 w-4" />
            Voltar para mesas
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 space-y-4">
        <OrderSummary
          editable={editable}
          mutationPending={itemsPending}
          onAddItem={() => setPickerOpen((open) => !open)}
          onRemoveItem={handleRemoveItem}
          order={order}
        />
        {editable && pickerOpen ? (
          <div
            className="scroll-mt-20 rounded-lg border bg-card p-3 shadow-sm sm:p-4"
            ref={pickerRef}
          >
            <h3 className="mb-3 text-sm font-semibold">
              Adicionar item ao pedido #{order.dailyNumber}
            </h3>
            <MenuPicker
              categories={visibleCategories}
              loading={productsQuery.isLoading || categoriesQuery.isLoading}
              onSelectCategory={setSelectedCategoryId}
              onSelectProduct={handleSelectProduct}
              products={productsQuery.data ?? []}
              selectedCategoryId={selectedCategoryId}
            />
          </div>
        ) : null}
        {actionError ? (
          <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {actionError}
          </p>
        ) : null}
      </div>
      <div className="w-full shrink-0 lg:sticky lg:top-24 lg:max-w-sm">
        <OrderStatusControls
          onAdvance={handleAdvance}
          onCancel={handleCancel}
          order={order}
          pending={updateStatus.isPending}
        />
      </div>

      <SettleOrderDialog
        onOpenChange={(open) => {
          if (!open) setSettlement(null);
        }}
        open={settlement !== null}
        order={settlement}
      />
      <ItemEditorDialog
        initialDraft={null}
        onConfirm={handleEditorConfirm}
        onOpenChange={(open) => setEditor(open ? editor : { open: false })}
        open={editor.open}
        productId={editor.open ? editor.productId : null}
      />
    </div>
  );
}
