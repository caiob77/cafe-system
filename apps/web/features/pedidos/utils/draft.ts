import type { DraftOrderItem } from '../types';

export function generateDraftItemId(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return `tmp-${globalThis.crypto.randomUUID()}`;
  }
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function calculateDraftSubtotal(items: DraftOrderItem[]): number {
  return items.reduce((total, item) => {
    const itemTotal = Number(item.unitPrice) * item.quantity;
    const addonsTotal = item.addons.reduce(
      (sum, addon) => sum + Number(addon.unitPrice) * addon.quantity,
      0,
    );
    return total + itemTotal + addonsTotal;
  }, 0);
}

export function calculateDraftItemTotal(item: DraftOrderItem): number {
  const itemTotal = Number(item.unitPrice) * item.quantity;
  const addonsTotal = item.addons.reduce(
    (sum, addon) => sum + Number(addon.unitPrice) * addon.quantity,
    0,
  );
  return itemTotal + addonsTotal;
}
