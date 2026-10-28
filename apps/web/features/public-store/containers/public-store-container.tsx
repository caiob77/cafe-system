'use client';

import { Loader2, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

import { formatPrice } from '@/features/cardapio/utils/format-price';
import { generateDraftItemId } from '@/features/pedidos/utils/draft';
import { createPublicOrder, getPublicDeliverySettings, getPublicMenu } from '../api';
import type { PublicCartItem, PublicStoreProduct } from '../types';

type PublicStoreContainerProps = {
  slug: string;
};

type CustomerForm = {
  name: string;
  phone: string;
  address: string;
  neighborhood: string;
  reference: string;
  notes: string;
};

type EditorState =
  | { open: false }
  | {
      open: true;
      product: PublicStoreProduct;
      quantity: number;
      notes: string;
      addons: Record<string, number>;
    };

const emptyCustomer: CustomerForm = {
  name: '',
  phone: '',
  address: '',
  neighborhood: '',
  reference: '',
  notes: '',
};

function moneyToNumber(value: string | null | undefined) {
  return value ? Number(value) : 0;
}

function cartItemTotal(item: PublicCartItem) {
  const addonsTotal = item.addons.reduce(
    (sum, addon) => sum + moneyToNumber(addon.unitPrice) * addon.quantity,
    0,
  );
  return moneyToNumber(item.unitPrice) * item.quantity + addonsTotal;
}

function makeIdempotencyKey() {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `public-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function PublicStoreContainer({ slug }: PublicStoreContainerProps) {
  const [menu, setMenu] = useState<Awaited<ReturnType<typeof getPublicMenu>> | null>(null);
  const [settings, setSettings] = useState<Awaited<
    ReturnType<typeof getPublicDeliverySettings>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [cart, setCart] = useState<PublicCartItem[]>([]);
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const [customer, setCustomer] = useState<CustomerForm>(emptyCustomer);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ dailyNumber: number; total: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(makeIdempotencyKey);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setLoadError(null);

    Promise.all([getPublicMenu(slug), getPublicDeliverySettings(slug)])
      .then(([menuData, settingsData]) => {
        if (ignore) return;
        setMenu(menuData);
        setSettings(settingsData);
        setSelectedCategoryId(menuData.categories[0]?.id ?? null);
      })
      .catch((err) => {
        if (ignore) return;
        setLoadError(err instanceof ApiError ? err.message : 'Não foi possível carregar a loja.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [slug]);

  const products = menu?.products ?? [];
  const visibleProducts = selectedCategoryId
    ? products.filter((product) => product.categoryId === selectedCategoryId)
    : products;

  const subtotal = cart.reduce((sum, item) => sum + cartItemTotal(item), 0);
  const strictNeighborhoods = (settings?.neighborhoods.length ?? 0) > 0;
  const neighborhoodFee = useMemo(() => {
    const neighborhood = customer.neighborhood.trim().toLowerCase();
    if (!settings) return null;
    if (strictNeighborhoods) {
      const entry = settings.neighborhoods.find(
        (fee) => fee.neighborhood.toLowerCase() === neighborhood,
      );
      return entry?.fee ?? null;
    }
    return settings.defaultDeliveryFee ?? '0.00';
  }, [customer.neighborhood, settings, strictNeighborhoods]);

  const neighborhoodUnsupported =
    strictNeighborhoods && customer.neighborhood.trim().length > 0 && neighborhoodFee === null;
  const deliveryFee = moneyToNumber(neighborhoodFee);
  const total = subtotal + deliveryFee;
  const deliveryBlocked = !settings?.deliveryEnabled || !settings?.deliveryOpen;

  function updateCustomer(field: keyof CustomerForm, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function openEditor(product: PublicStoreProduct) {
    setEditor({ open: true, product, quantity: 1, notes: '', addons: {} });
  }

  function addEditorItem() {
    if (!editor.open) return;
    const addons = editor.product.addons
      .map((addon) => ({
        productAddonId: addon.id,
        name: addon.name,
        unitPrice: addon.price,
        quantity: editor.addons[addon.id] ?? 0,
      }))
      .filter((addon) => addon.quantity > 0);

    setCart((current) => [
      ...current,
      {
        tempId: generateDraftItemId(),
        productId: editor.product.id,
        productName: editor.product.name,
        unitPrice: editor.product.price,
        quantity: editor.quantity,
        notes: editor.notes.trim().length > 0 ? editor.notes.trim() : null,
        addons,
      },
    ]);
    setEditor({ open: false });
  }

  async function submitOrder() {
    setSubmitError(null);
    setSuccess(null);

    if (cart.length === 0) {
      setSubmitError('Adicione pelo menos um item ao carrinho.');
      return;
    }
    if (
      !customer.name.trim() ||
      !customer.phone.trim() ||
      !customer.address.trim() ||
      !customer.neighborhood.trim()
    ) {
      setSubmitError('Informe nome, telefone, endereço e bairro.');
      return;
    }
    if (deliveryBlocked) {
      setSubmitError('Delivery fechado no momento.');
      return;
    }
    if (neighborhoodUnsupported) {
      setSubmitError(`Não entregamos no bairro "${customer.neighborhood.trim()}".`);
      return;
    }

    setSubmitting(true);
    try {
      const order = await createPublicOrder(slug, {
        customer: {
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          address: customer.address.trim(),
          neighborhood: customer.neighborhood.trim(),
          reference: customer.reference.trim() || null,
        },
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes,
          addons: item.addons.map((addon) => ({
            productAddonId: addon.productAddonId,
            quantity: addon.quantity,
          })),
        })),
        notes: customer.notes.trim() || null,
        idempotencyKey,
      });
      setSuccess({ dailyNumber: order.dailyNumber, total: order.total });
      setCart([]);
      setCustomer(emptyCustomer);
      setIdempotencyKey(makeIdempotencyKey());
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Não foi possível enviar o pedido.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </main>
    );
  }

  if (loadError || !menu || !settings) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center bg-background p-4">
        <Alert variant="destructive">{loadError ?? 'Loja não encontrada.'}</Alert>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-3 pb-28 sm:p-5 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:pb-5">
        <section className="space-y-4">
          <header className="rounded-lg border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-muted-foreground">Delivery</p>
            <h1 className="text-2xl font-semibold">{menu.organization.name}</h1>
            {menu.organization.addressLine ? (
              <p className="mt-1 text-sm text-muted-foreground">{menu.organization.addressLine}</p>
            ) : null}
          </header>

          {deliveryBlocked ? (
            <Alert variant="destructive">
              Delivery fechado ou desativado no momento. O cardápio continua disponível para
              consulta.
            </Alert>
          ) : null}
          {success ? <Alert>Pedido #{success.dailyNumber} recebido.</Alert> : null}
          {submitError ? <Alert variant="destructive">{submitError}</Alert> : null}

          <div className="flex gap-2 overflow-x-auto pb-1">
            {menu.categories.map((category) => (
              <Button
                className="shrink-0"
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                size="touch"
                type="button"
                variant={category.id === selectedCategoryId ? 'default' : 'secondary'}
              >
                {category.name}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visibleProducts.map((product) => (
              <button
                className="grid grid-cols-[96px_1fr] overflow-hidden rounded-lg border bg-card text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                key={product.id}
                onClick={() => openEditor(product)}
                type="button"
              >
                <div className="h-28 bg-muted">
                  {product.imageUrl ? (
                    <img
                      alt={product.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      src={product.imageUrl}
                    />
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-col gap-1 p-3">
                  <h2 className="line-clamp-2 text-sm font-semibold">{product.name}</h2>
                  {product.description ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {product.description}
                    </p>
                  ) : null}
                  <span className="mt-auto text-sm font-semibold text-primary">
                    {formatPrice(product.price)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="space-y-3 rounded-lg border bg-card p-4 shadow-sm lg:sticky lg:top-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ShoppingCart className="h-4 w-4" />
            Carrinho
          </h2>

          {cart.length === 0 ? (
            <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
              Escolha um produto para começar.
            </p>
          ) : (
            <ul className="space-y-2">
              {cart.map((item) => (
                <li className="rounded-md border bg-background p-3" key={item.tempId}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {item.quantity}x {item.productName}
                      </p>
                      {item.addons.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.addons
                            .map((addon) => `${addon.quantity}x ${addon.name}`)
                            .join(', ')}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-primary">
                      {formatPrice(cartItemTotal(item))}
                    </span>
                  </div>
                  <Button
                    aria-label={`Remover ${item.productName}`}
                    className="mt-2"
                    onClick={() =>
                      setCart((current) => current.filter((entry) => entry.tempId !== item.tempId))
                    }
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="public-name">Nome</Label>
                <Input
                  id="public-name"
                  onChange={(event) => updateCustomer('name', event.target.value)}
                  value={customer.name}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="public-phone">Telefone</Label>
                <Input
                  id="public-phone"
                  inputMode="tel"
                  onChange={(event) => updateCustomer('phone', event.target.value)}
                  value={customer.phone}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="public-address">Endereço</Label>
              <Input
                id="public-address"
                onChange={(event) => updateCustomer('address', event.target.value)}
                value={customer.address}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="public-neighborhood">Bairro</Label>
                <Input
                  id="public-neighborhood"
                  onChange={(event) => updateCustomer('neighborhood', event.target.value)}
                  value={customer.neighborhood}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="public-reference">Referência</Label>
                <Input
                  id="public-reference"
                  onChange={(event) => updateCustomer('reference', event.target.value)}
                  value={customer.reference}
                />
              </div>
            </div>
            {neighborhoodUnsupported ? (
              <p className="text-xs font-medium text-destructive">Não entregamos neste bairro.</p>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="public-notes">Observação</Label>
              <Textarea
                id="public-notes"
                onChange={(event) => updateCustomer('notes', event.target.value)}
                rows={2}
                value={customer.notes}
              />
            </div>
          </div>

          <div className="space-y-2 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entrega</span>
              <span>{formatPrice(deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
          </div>

          <Button
            className="w-full"
            disabled={submitting || deliveryBlocked || cart.length === 0}
            onClick={submitOrder}
            type="button"
          >
            {submitting ? 'Enviando...' : 'Enviar pedido'}
          </Button>
        </aside>
      </div>

      {editor.open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 sm:items-center sm:justify-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-card p-4 shadow-lg">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{editor.product.name}</h2>
              <p className="text-sm font-semibold text-primary">
                {formatPrice(editor.product.price)}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium">Quantidade</span>
              <div className="flex items-center gap-2">
                <Button
                  aria-label="Diminuir quantidade"
                  onClick={() =>
                    setEditor((current) =>
                      current.open
                        ? { ...current, quantity: Math.max(1, current.quantity - 1) }
                        : current,
                    )
                  }
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-semibold">{editor.quantity}</span>
                <Button
                  aria-label="Aumentar quantidade"
                  onClick={() =>
                    setEditor((current) =>
                      current.open
                        ? { ...current, quantity: Math.min(99, current.quantity + 1) }
                        : current,
                    )
                  }
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {editor.product.addons.length > 0 ? (
              <div className="mt-4 space-y-2">
                <Label>Adicionais</Label>
                {editor.product.addons.map((addon) => {
                  const quantity = editor.addons[addon.id] ?? 0;
                  return (
                    <div
                      className={cn(
                        'flex items-center justify-between rounded-md border bg-background px-3 py-2',
                        quantity > 0 && 'border-primary/50',
                      )}
                      key={addon.id}
                    >
                      <div>
                        <p className="text-sm font-medium">{addon.name}</p>
                        <p className="text-xs text-muted-foreground">+{formatPrice(addon.price)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          aria-label={`Diminuir ${addon.name}`}
                          onClick={() =>
                            setEditor((current) => {
                              if (!current.open) return current;
                              return {
                                ...current,
                                addons: {
                                  ...current.addons,
                                  [addon.id]: Math.max(0, quantity - 1),
                                },
                              };
                            })
                          }
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
                        <Button
                          aria-label={`Aumentar ${addon.name}`}
                          onClick={() =>
                            setEditor((current) => {
                              if (!current.open) return current;
                              return {
                                ...current,
                                addons: {
                                  ...current.addons,
                                  [addon.id]: Math.min(99, quantity + 1),
                                },
                              };
                            })
                          }
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-4 space-y-1">
              <Label htmlFor="public-item-notes">Observação</Label>
              <Textarea
                id="public-item-notes"
                onChange={(event) =>
                  setEditor((current) =>
                    current.open ? { ...current, notes: event.target.value } : current,
                  )
                }
                rows={2}
                value={editor.notes}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button onClick={() => setEditor({ open: false })} type="button" variant="secondary">
                Cancelar
              </Button>
              <Button onClick={addEditorItem} type="button">
                Adicionar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
