'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { CartSummary } from '@/components/pedidos/cart-summary';
import { ItemEditorDialog } from '@/components/pedidos/item-editor-dialog';
import { MenuPicker } from '@/components/pedidos/menu-picker';
import { ApiError } from '@/lib/api-client';

import { useCategories } from '@/features/cardapio/api/use-categories';
import { useProducts } from '@/features/cardapio/api/use-products';
import type { Product } from '@/features/cardapio/types';
import { useCreateOrder } from '@/features/pedidos/api/use-orders';
import type { CreateOrderPayload, DraftOrderItem } from '@/features/pedidos/types';
import { generateDraftItemId } from '@/features/pedidos/utils/draft';

type NewOrderContainerProps = {
  tableId: string;
  tableNumber: number;
};

type EditorState =
  | { open: false }
  | { open: true; productId: string; draft: DraftOrderItem | null };

export function NewOrderContainer({ tableId, tableNumber }: NewOrderContainerProps) {
  const router = useRouter();
  const categoriesQuery = useCategories();
  const productsQuery = useProducts();
  const createOrder = useCreateOrder();

  const [draftItems, setDraftItems] = useState<DraftOrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const visibleCategories = useMemo(
    () => (categoriesQuery.data ?? []).filter((category) => category.active),
    [categoriesQuery.data],
  );

  useEffect(() => {
    if (visibleCategories.length === 0) {
      if (selectedCategoryId !== null) setSelectedCategoryId(null);
      return;
    }
    const stillExists = visibleCategories.some((c) => c.id === selectedCategoryId);
    if (!stillExists) {
      const first = visibleCategories[0];
      if (first) setSelectedCategoryId(first.id);
    }
  }, [visibleCategories, selectedCategoryId]);

  function handleSelectProduct(product: Product) {
    setEditor({ open: true, productId: product.id, draft: null });
  }

  function handleEditDraft(draft: DraftOrderItem) {
    setEditor({ open: true, productId: draft.productId, draft });
  }

  function handleEditorConfirm(draft: DraftOrderItem) {
    setDraftItems((current) => {
      if (draft.tempId.length === 0) {
        return [...current, { ...draft, tempId: generateDraftItemId() }];
      }
      return current.map((item) => (item.tempId === draft.tempId ? draft : item));
    });
    setEditor({ open: false });
  }

  function handleRemoveDraft(tempId: string) {
    setDraftItems((current) => current.filter((item) => item.tempId !== tempId));
  }

  async function handleConfirmOrder() {
    if (draftItems.length === 0) return;
    setSubmitError(null);

    const payload: CreateOrderPayload = {
      type: 'dine_in',
      tableId,
      notes: orderNotes.trim().length > 0 ? orderNotes.trim() : null,
      items: draftItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes ?? undefined,
        addons: item.addons.map((addon) => ({
          productAddonId: addon.productAddonId,
          quantity: addon.quantity,
        })),
      })),
    };

    try {
      const order = await createOrder.mutateAsync(payload);
      router.replace(`/mesas/${tableId}?orderId=${order.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : 'Não foi possível confirmar o pedido.',
      );
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Novo pedido — Mesa #{tableNumber}</h2>
            <p className="text-sm text-muted-foreground">
              Selecione produtos do cardápio para montar o pedido.
            </p>
          </div>
        </div>

        <MenuPicker
          categories={visibleCategories}
          loading={productsQuery.isLoading || categoriesQuery.isLoading}
          onSelectCategory={setSelectedCategoryId}
          onSelectProduct={handleSelectProduct}
          products={productsQuery.data ?? []}
          selectedCategoryId={selectedCategoryId}
        />
      </div>

      <div className="w-full shrink-0 lg:max-w-sm">
        <CartSummary
          items={draftItems}
          notes={orderNotes}
          onChangeNotes={setOrderNotes}
          onConfirm={handleConfirmOrder}
          onEdit={handleEditDraft}
          onRemove={handleRemoveDraft}
          submitting={createOrder.isPending}
        />
        {submitError ? (
          <p className="mt-2 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitError}
          </p>
        ) : null}
      </div>

      <ItemEditorDialog
        initialDraft={editor.open ? editor.draft : null}
        onConfirm={handleEditorConfirm}
        onOpenChange={(open) => setEditor(open ? editor : { open: false })}
        open={editor.open}
        productId={editor.open ? editor.productId : null}
      />
    </div>
  );
}
