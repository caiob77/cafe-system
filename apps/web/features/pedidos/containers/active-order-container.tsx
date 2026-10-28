'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ItemEditorDialog } from '@/components/pedidos/item-editor-dialog';
import { MenuPicker } from '@/components/pedidos/menu-picker';
import { OrderStatusControls } from '@/components/pedidos/order-status-controls';
import { OrderSummary } from '@/components/pedidos/order-summary';
import { Button } from '@/components/ui/button';
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
import type { DraftOrderItem, OrderStatus } from '@/features/pedidos/types';
import { canModifyOrderItems } from '@/features/pedidos/utils/editing';

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
  const orderQuery = useOrder(orderId);
  const updateStatus = useUpdateOrderStatus();
  const addItem = useAddOrderItem();
  const removeItem = useRemoveOrderItem();

  const categoriesQuery = useCategories();
  const productsQuery = useProducts();

  const [actionError, setActionError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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

  async function handleAdvance(next: OrderStatus) {
    if (!orderQuery.data) return;
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
    const reason = window.prompt('Motivo do cancelamento:');
    if (!reason || reason.trim().length < 2) return;
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
    if (!window.confirm('Remover este item do pedido?')) return;
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
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex-1 space-y-4">
        <OrderSummary
          editable={editable}
          mutationPending={itemsPending}
          onAddItem={() => setPickerOpen((open) => !open)}
          onRemoveItem={handleRemoveItem}
          order={order}
        />
        {editable && pickerOpen ? (
          <div className="rounded-lg border bg-card p-4 shadow-sm">
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
      <div className="w-full shrink-0 lg:max-w-sm">
        <OrderStatusControls
          onAdvance={handleAdvance}
          onCancel={handleCancel}
          order={order}
          pending={updateStatus.isPending}
        />
      </div>

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
