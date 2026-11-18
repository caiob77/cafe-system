'use client';

import { ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { CartSummary } from '@/components/pedidos/cart-summary';
import { ItemEditorDialog } from '@/components/pedidos/item-editor-dialog';
import { MenuPicker } from '@/components/pedidos/menu-picker';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';

import { useCategories } from '@/features/cardapio/api/use-categories';
import { useProducts } from '@/features/cardapio/api/use-products';
import type { Product } from '@/features/cardapio/types';
import { formatPrice } from '@/features/cardapio/utils/format-price';
import { useCreateOrder } from '@/features/pedidos/api/use-orders';
import type { CreateOrderPayload, DraftOrderItem } from '@/features/pedidos/types';
import { calculateDraftSubtotal, generateDraftItemId } from '@/features/pedidos/utils/draft';

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
  const [cartInView, setCartInView] = useState(false);

  // Esconde a barra fixa do carrinho quando o próprio carrinho já está na tela.
  useEffect(() => {
    const cart = document.getElementById('new-order-cart');
    if (!cart || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setCartInView(entry?.isIntersecting ?? false),
      { threshold: 0.25 },
    );
    observer.observe(cart);
    return () => observer.disconnect();
  }, []);

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

  const itemCount = draftItems.reduce((sum, item) => sum + item.quantity, 0);

  function scrollToCart() {
    document
      .getElementById('new-order-cart')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="flex flex-col gap-4 pb-20 lg:flex-row lg:items-start lg:pb-0">
      <div className="min-w-0 flex-1 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Novo pedido — Mesa #{tableNumber}</h2>
            <p className="hidden text-sm text-muted-foreground sm:block">
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

      <div
        className="w-full shrink-0 scroll-mt-20 lg:sticky lg:top-24 lg:max-w-sm"
        id="new-order-cart"
      >
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

      {draftItems.length > 0 && !cartInView ? (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t bg-card/95 px-4 py-2.5 shadow-[0_-4px_12px_-6px_rgb(0_0_0/0.15)] backdrop-blur animate-in slide-in-from-bottom-4 lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                {itemCount} {itemCount === 1 ? 'item' : 'itens'} no carrinho
              </p>
              <p className="text-base font-semibold tabular-nums text-primary">
                {formatPrice(calculateDraftSubtotal(draftItems))}
              </p>
            </div>
            <Button onClick={scrollToCart} size="touch" type="button">
              <ShoppingCart className="h-4 w-4" />
              Revisar e enviar
            </Button>
          </div>
        </div>
      ) : null}

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
