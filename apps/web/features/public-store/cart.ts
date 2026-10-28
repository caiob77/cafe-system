import type { PublicCartItem } from './types';

export function moneyToNumber(value: string | null | undefined) {
  if (!value) return 0;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function cartItemTotal(item: PublicCartItem) {
  const addonsTotal = item.addons.reduce(
    (sum, addon) => sum + moneyToNumber(addon.unitPrice) * addon.quantity,
    0,
  );
  return moneyToNumber(item.unitPrice) * item.quantity + addonsTotal;
}

export function cartSubtotal(items: PublicCartItem[]) {
  return items.reduce((sum, item) => sum + cartItemTotal(item), 0);
}

export function makeIdempotencyKey() {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `public-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function itemCountLabel(count: number) {
  return count === 1 ? '1 item' : `${count} itens`;
}
