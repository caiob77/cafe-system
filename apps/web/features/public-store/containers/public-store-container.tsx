'use client';

import { useEffect, useMemo, useState } from 'react';

import { ApiError } from '@/lib/api-client';

import { formatPrice } from '@/features/cardapio/utils/format-price';
import { generateDraftItemId } from '@/features/pedidos/utils/draft';
import { createPublicOrder, getPublicDeliverySettings, getPublicMenu } from '../api';
import { applyBrandColor } from '../brand-color';
import { cartSubtotal, makeIdempotencyKey, moneyToNumber } from '../cart';
import { CategoryRail } from '../components/category-rail';
import { ItemSheet } from '../components/item-sheet';
import { MenuList } from '../components/menu-list';
import { OrderBar } from '../components/order-bar';
import { type FeeView, OrderPanel } from '../components/order-panel';
import { OrderSuccess } from '../components/order-success';
import { StoreHeader } from '../components/store-header';
import { useStorePortal } from '../components/store-theme';
import type { PublicCartItem, PublicCustomerForm, PublicStoreProduct } from '../types';
import { type RequiredCustomerField, validateCustomer, validateCustomerField } from '../validation';

type PublicStoreContainerProps = {
  slug: string;
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

const emptyCustomer: PublicCustomerForm = {
  name: '',
  phone: '',
  address: '',
  neighborhood: '',
  reference: '',
  notes: '',
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isDesktop;
}

export function PublicStoreContainer({ slug }: PublicStoreContainerProps) {
  const portal = useStorePortal();
  const isDesktop = useIsDesktop();
  const [menu, setMenu] = useState<Awaited<ReturnType<typeof getPublicMenu>> | null>(null);
  const [settings, setSettings] = useState<Awaited<
    ReturnType<typeof getPublicDeliverySettings>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [cart, setCart] = useState<PublicCartItem[]>([]);
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const [customer, setCustomer] = useState<PublicCustomerForm>(emptyCustomer);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RequiredCustomerField, string>>>(
    {},
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reviewTick, setReviewTick] = useState(0);
  const [success, setSuccess] = useState<{ dailyNumber: number; total: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(makeIdempotencyKey);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [step, setStep] = useState<'items' | 'delivery'>('items');

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

  useEffect(() => {
    if (!menu) return;
    document.title = `${menu.organization.name} | Pedido`;
  }, [menu]);

  useEffect(() => {
    if (!portal) return;
    applyBrandColor(portal, menu?.organization.brandColor ?? null);
    return () => applyBrandColor(portal, null);
  }, [menu?.organization.brandColor, portal]);

  useEffect(() => {
    if (cart.length === 0) setStep('items');
  }, [cart.length]);

  useEffect(() => {
    const lock = editor.open || (checkoutOpen && !isDesktop);
    if (!lock) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [checkoutOpen, editor.open, isDesktop]);

  useEffect(() => {
    if (!checkoutOpen || isDesktop) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setCheckoutOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [checkoutOpen, isDesktop]);

  const products = menu?.products ?? [];
  const visibleProducts = selectedCategoryId
    ? products.filter((product) => product.categoryId === selectedCategoryId)
    : products;
  const subtotal = cartSubtotal(cart);
  const strictNeighborhoods = (settings?.neighborhoods.length ?? 0) > 0;
  const neighborhoodMode = strictNeighborhoods ? 'list' : 'text';

  const fee: FeeView = useMemo(() => {
    if (!settings) return { status: 'pending' };
    const neighborhood = customer.neighborhood.trim().toLowerCase();
    if (!strictNeighborhoods) {
      return { status: 'known', amount: moneyToNumber(settings.defaultDeliveryFee ?? '0.00') };
    }
    if (neighborhood.length === 0) return { status: 'pending' };
    const entry = settings.neighborhoods.find(
      (item) => item.neighborhood.toLowerCase() === neighborhood,
    );
    if (!entry) return { status: 'unsupported' };
    return { status: 'known', amount: moneyToNumber(entry.fee) };
  }, [customer.neighborhood, settings, strictNeighborhoods]);

  const deliveryBlocked = !settings?.deliveryEnabled || !settings?.deliveryOpen;
  const total = subtotal + (fee.status === 'known' ? fee.amount : 0);
  const menuInert = checkoutOpen && !isDesktop;

  function updateCustomer(field: keyof PublicCustomerForm, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
    if (field === 'name' || field === 'phone' || field === 'address' || field === 'neighborhood') {
      setFieldErrors((current) => {
        if (!current[field]) return current;
        const message = validateCustomerField(field, value, neighborhoodMode);
        if (!message) {
          const next = { ...current };
          delete next[field];
          return next;
        }
        return { ...current, [field]: message };
      });
    }
  }

  function blurField(field: RequiredCustomerField, value: string) {
    const message = validateCustomerField(field, value, neighborhoodMode);
    setFieldErrors((current) => {
      if (!message) {
        if (!current[field]) return current;
        const next = { ...current };
        delete next[field];
        return next;
      }
      return { ...current, [field]: message };
    });
  }

  function openEditor(product: PublicStoreProduct) {
    setEditor({ open: true, product, quantity: 1, notes: '', addons: {} });
  }

  function setAddonQuantity(addonId: string, quantity: number) {
    setEditor((current) => {
      if (!current.open) return current;
      const nextQuantity = Math.max(0, Math.min(99, quantity));
      const selected = Object.values(current.addons).filter((value) => value > 0).length;
      const alreadySelected = (current.addons[addonId] ?? 0) > 0;
      if (nextQuantity > 0 && !alreadySelected && selected >= 20) return current;
      return {
        ...current,
        addons: { ...current.addons, [addonId]: nextQuantity },
      };
    });
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
    setStep('items');
  }

  function continueToDelivery() {
    if (cart.length === 0 || deliveryBlocked) return;
    setSubmitError(null);
    setStep('delivery');
    setCheckoutOpen(true);
  }

  async function submitOrder() {
    setSubmitError(null);
    const errors = validateCustomer(
      {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        neighborhood: customer.neighborhood,
      },
      neighborhoodMode,
    );
    if (Object.keys(errors).length > 0 || fee.status === 'unsupported' || deliveryBlocked) {
      if (fee.status === 'unsupported') {
        errors.neighborhood = 'Não entregamos neste bairro.';
      }
      setFieldErrors(errors);
      if (deliveryBlocked) setSubmitError('O delivery está fechado.');
      setReviewTick((current) => current + 1);
      return;
    }
    if (cart.length === 0 || !settings) return;

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
      setFieldErrors({});
      setCheckoutOpen(false);
      setStep('items');
      setIdempotencyKey(makeIdempotencyKey());
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Não foi possível enviar o pedido.');
      setReviewTick((current) => current + 1);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main aria-busy="true" className="flex min-h-dvh items-center justify-center px-6">
        <p>Carregando cardápio</p>
      </main>
    );
  }

  if (loadError || !menu || !settings) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center px-6">
        <div role="alert">
          <h1 className="font-display text-4xl font-medium leading-none">Loja indisponível</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {loadError ?? 'Loja não encontrada.'}
          </p>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <OrderSuccess
        dailyNumber={success.dailyNumber}
        onAnother={() => setSuccess(null)}
        organizationName={menu.organization.name}
        total={success.total}
      />
    );
  }

  const panel = (
    <OrderPanel
      cart={cart}
      className={checkoutOpen ? 'max-lg:fixed max-lg:inset-0 max-lg:z-40' : 'max-lg:hidden'}
      customer={customer}
      deliveryBlocked={deliveryBlocked}
      fee={fee}
      fieldErrors={fieldErrors}
      neighborhoodMode={neighborhoodMode}
      neighborhoods={settings.neighborhoods}
      onBack={() => setStep('items')}
      onBlurField={blurField}
      onChange={updateCustomer}
      onClose={() => setCheckoutOpen(false)}
      onContinue={continueToDelivery}
      onRemove={(tempId) => setCart((current) => current.filter((item) => item.tempId !== tempId))}
      onSubmit={submitOrder}
      reviewTick={reviewTick}
      showClose={checkoutOpen}
      step={step}
      submitError={submitError}
      submitting={submitting}
      subtotal={subtotal}
    />
  );

  return (
    <main>
      <div className="mx-auto grid w-full max-w-5xl lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:items-start">
        <div inert={menuInert ? true : undefined}>
          <StoreHeader
            addressLine={menu.organization.addressLine}
            deliveryEnabled={settings.deliveryEnabled}
            deliveryOpen={settings.deliveryOpen}
            logo={menu.organization.logo}
            name={menu.organization.name}
            phone={menu.organization.phone}
            schedule={menu.delivery.deliverySchedule}
          />
          <CategoryRail
            categories={menu.categories}
            onSelect={setSelectedCategoryId}
            selectedId={selectedCategoryId}
          />
          <div className={cart.length > 0 ? 'pb-32 lg:pb-0' : undefined}>
            <MenuList onOpen={openEditor} products={visibleProducts} />
          </div>
        </div>
        {panel}
      </div>

      {cart.length > 0 && !checkoutOpen ? (
        <OrderBar
          count={cart.reduce((sum, item) => sum + item.quantity, 0)}
          detail={fee.status === 'known' ? null : 'Entrega a definir'}
          onOpen={() => {
            setStep('items');
            setCheckoutOpen(true);
          }}
          totalLabel={formatPrice(total)}
        />
      ) : null}

      {editor.open && portal ? (
        <ItemSheet
          addons={editor.addons}
          container={portal}
          notes={editor.notes}
          onAdd={addEditorItem}
          onAddon={setAddonQuantity}
          onClose={() => setEditor({ open: false })}
          onNotes={(notes) =>
            setEditor((current) => (current.open ? { ...current, notes } : current))
          }
          onQuantity={(quantity) =>
            setEditor((current) => (current.open ? { ...current, quantity } : current))
          }
          product={editor.product}
          quantity={editor.quantity}
        />
      ) : null}
    </main>
  );
}
