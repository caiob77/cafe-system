import type { DraftOrderItem, OrderItemAddon } from '../types';

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
  return items.reduce((total, item) => total + calculateDraftItemTotal(item), 0);
}

export function calculateDraftItemTotal(item: DraftOrderItem): number {
  const addonsPerUnit = item.addons.reduce(
    (sum, addon) => sum + Number(addon.unitPrice) * addon.quantity,
    0,
  );
  return (Number(item.unitPrice) + addonsPerUnit) * item.quantity;
}

export function orderAddonTotalQuantity(addon: OrderItemAddon, itemQuantity: number): number {
  return addon.scalesWithItem ? addon.quantity * itemQuantity : addon.quantity;
}
