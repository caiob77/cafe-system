'use client';

import { Loader2, Plus, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { CartSummary } from '@/components/pedidos/cart-summary';
import { ItemEditorDialog } from '@/components/pedidos/item-editor-dialog';
import { MenuPicker } from '@/components/pedidos/menu-picker';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ApiError } from '@/lib/api-client';

import { useCategories } from '@/features/cardapio/api/use-categories';
import { useProducts } from '@/features/cardapio/api/use-products';
import type { Product } from '@/features/cardapio/types';
import { formatPrice } from '@/features/cardapio/utils/format-price';
import { useCustomers } from '@/features/clientes/api/use-customers';
import { useDeliveryFees } from '@/features/delivery/api/use-delivery-fees';
import { useDeliverySettings } from '@/features/delivery/api/use-delivery-settings';
import { useCreateOrder } from '@/features/pedidos/api/use-orders';
import type { DraftOrderItem } from '@/features/pedidos/types';
import { generateDraftItemId } from '@/features/pedidos/utils/draft';

type EditorState =
  | { open: false }
  | { open: true; productId: string; draft: DraftOrderItem | null };

export function NewDeliveryOrderContainer() {
  const categoriesQuery = useCategories();
  const productsQuery = useProducts();
  const customersQuery = useCustomers({ limit: 100 });
  const deliveryFeesQuery = useDeliveryFees();
  const deliverySettingsQuery = useDeliverySettings();
  const createOrder = useCreateOrder();

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [draftItems, setDraftItems] = useState<DraftOrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<number | null>(null);

  const visibleCategories = useMemo(
    () => (categoriesQuery.data ?? []).filter((category) => category.active),
    [categoriesQuery.data],
  );

  const customers = customersQuery.data ?? [];
  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(term) || customer.phone.includes(customerSearch),
    );
  }, [customerSearch, customers]);

  const selectedCustomer = customers.find((customer) => customer.id === customerId) ?? null;
  const selectedFee = useMemo(() => {
    if (!selectedCustomer?.neighborhood)
      return deliverySettingsQuery.data?.defaultDeliveryFee ?? null;
    const fee = (deliveryFeesQuery.data ?? []).find(
      (entry) => entry.neighborhood.toLowerCase() === selectedCustomer.neighborhood?.toLowerCase(),
    );
    return fee?.fee ?? deliverySettingsQuery.data?.defaultDeliveryFee ?? null;
  }, [deliveryFeesQuery.data, deliverySettingsQuery.data, selectedCustomer]);

  useEffect(() => {
    if (visibleCategories.length === 0) {
      if (selectedCategoryId !== null) setSelectedCategoryId(null);
      return;
    }
    const stillExists = visibleCategories.some((category) => category.id === selectedCategoryId);
    if (!stillExists) {
      const first = visibleCategories[0];
      if (first) setSelectedCategoryId(first.id);
    }
  }, [visibleCategories, selectedCategoryId]);

  function handleSelectProduct(product: Product) {
    setEditor({ open: true, productId: product.id, draft: null });
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

  async function handleConfirmOrder() {
    if (!customerId || draftItems.length === 0) return;
    setSubmitError(null);
    setCreatedOrderNumber(null);

    try {
      const order = await createOrder.mutateAsync({
        type: 'delivery',
        customerId,
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
      });
      setCreatedOrderNumber(order.dailyNumber);
      setDraftItems([]);
      setOrderNotes('');
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : 'Não foi possível criar o pedido delivery.',
      );
    }
  }

  const deliveryDisabled = deliverySettingsQuery.data?.deliveryEnabled === false;

  return (
    <div className="flex flex-col gap-4">
      {deliveryDisabled ? (
        <Alert variant="destructive">Delivery está desativado nas configurações.</Alert>
      ) : null}
      {submitError ? <Alert variant="destructive">{submitError}</Alert> : null}
      {createdOrderNumber ? <Alert>Pedido #{createdOrderNumber} criado.</Alert> : null}

      <section className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-4 shadow-sm lg:grid-cols-[1fr_280px]">
        <div className="space-y-2">
          <Label htmlFor="customer-search">Cliente</Label>
          <Input
            id="customer-search"
            onChange={(event) => setCustomerSearch(event.target.value)}
            placeholder="Buscar por nome ou telefone"
            value={customerSearch}
          />
          <Select
            disabled={customersQuery.isLoading}
            onChange={(event) => setCustomerId(event.target.value)}
            value={customerId}
          >
            <option value="">Selecione um cliente</option>
            {filteredCustomers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} - {customer.phone}
              </option>
            ))}
          </Select>
        </div>

        <div className="rounded-md border bg-background p-3 text-sm">
          {selectedCustomer ? (
            <div className="flex flex-col gap-1">
              <span className="font-medium">{selectedCustomer.name}</span>
              <span className="text-xs text-muted-foreground">{selectedCustomer.phone}</span>
              <span className="text-xs text-muted-foreground">
                {[selectedCustomer.address, selectedCustomer.neighborhood]
                  .filter(Boolean)
                  .join(' - ') || 'Endereço não cadastrado'}
              </span>
              <span className="mt-1 text-xs font-medium">
                Taxa estimada: {selectedFee ? formatPrice(selectedFee) : formatPrice(0)}
              </span>
            </div>
          ) : (
            <div className="flex h-full min-h-24 flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
              <Truck className="h-5 w-5" />
              Selecione um cliente cadastrado.
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1 space-y-4">
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
            onEdit={(item) => setEditor({ open: true, productId: item.productId, draft: item })}
            onRemove={(tempId) =>
              setDraftItems((current) => current.filter((item) => item.tempId !== tempId))
            }
            confirmDisabled={!customerId || deliveryDisabled}
            submitting={createOrder.isPending}
          />
          {!customerId ? (
            <Button className="mt-2 w-full" disabled type="button" variant="secondary">
              <Plus className="h-4 w-4" />
              Selecione o cliente para confirmar
            </Button>
          ) : null}
          {createOrder.isPending ? (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Criando pedido delivery
            </div>
          ) : null}
        </div>
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
