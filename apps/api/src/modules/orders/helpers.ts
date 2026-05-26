import { Prisma, type PrismaClient } from '@cafe/db';
import type { OrderItemInput, OrderStatusValue, OrderTypeValue } from '@cafe/shared';

const ZERO = new Prisma.Decimal(0);

export type ResolvedAddon = {
  productAddonId: string;
  addonNameSnapshot: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
};

export type ResolvedItem = {
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  notes: string | null;
  addons: ResolvedAddon[];
};

export type ResolutionFailure = {
  code: string;
  message: string;
};

export type ResolutionResult =
  | { ok: true; items: ResolvedItem[] }
  | { ok: false; error: ResolutionFailure };

export async function resolveItemsForOrder(
  prisma: PrismaClient,
  tenantId: string,
  items: OrderItemInput[],
): Promise<ResolutionResult> {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const addonIds = [
    ...new Set(items.flatMap((item) => (item.addons ?? []).map((addon) => addon.productAddonId))),
  ];

  const [products, addons] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds }, organizationId: tenantId, deletedAt: null },
    }),
    addonIds.length
      ? prisma.productAddon.findMany({
          where: { id: { in: addonIds }, organizationId: tenantId, deletedAt: null },
        })
      : Promise.resolve([]),
  ]);

  const productById = new Map(products.map((product) => [product.id, product]));
  const addonById = new Map(addons.map((addon) => [addon.id, addon]));

  const missingProduct = productIds.find((id) => !productById.has(id));
  if (missingProduct) {
    return {
      ok: false,
      error: { code: 'product_not_found', message: `Produto ${missingProduct} indisponível` },
    };
  }

  const missingAddon = addonIds.find((id) => !addonById.has(id));
  if (missingAddon) {
    return {
      ok: false,
      error: { code: 'addon_not_found', message: `Adicional ${missingAddon} indisponível` },
    };
  }

  const resolved: ResolvedItem[] = [];

  for (const item of items) {
    const product = productById.get(item.productId);
    if (!product) {
      return {
        ok: false,
        error: { code: 'product_not_found', message: 'Produto não encontrado' },
      };
    }
    if (!product.available) {
      return {
        ok: false,
        error: {
          code: 'product_unavailable',
          message: `Produto "${product.name}" está esgotado`,
        },
      };
    }

    const resolvedAddons: ResolvedAddon[] = [];
    for (const inputAddon of item.addons ?? []) {
      const addon = addonById.get(inputAddon.productAddonId);
      if (!addon) {
        return {
          ok: false,
          error: { code: 'addon_not_found', message: 'Adicional não encontrado' },
        };
      }
      if (addon.productId !== product.id) {
        return {
          ok: false,
          error: {
            code: 'addon_mismatch',
            message: `Adicional "${addon.name}" não pertence ao produto "${product.name}"`,
          },
        };
      }
      if (!addon.available) {
        return {
          ok: false,
          error: {
            code: 'addon_unavailable',
            message: `Adicional "${addon.name}" indisponível`,
          },
        };
      }

      resolvedAddons.push({
        productAddonId: addon.id,
        addonNameSnapshot: addon.name,
        quantity: clampQuantity(inputAddon.quantity ?? item.quantity),
        unitPrice: addon.price,
      });
    }

    resolved.push({
      productId: product.id,
      productNameSnapshot: product.name,
      quantity: clampQuantity(item.quantity),
      unitPrice: product.price,
      notes: normalizeNotes(item.notes),
      addons: resolvedAddons,
    });
  }

  return { ok: true, items: resolved };
}

function clampQuantity(value: number): number {
  return Math.max(1, Math.min(99, Math.trunc(value)));
}

function normalizeNotes(notes: string | null | undefined): string | null {
  if (notes === undefined || notes === null) return null;
  const trimmed = notes.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function calculateItemsSubtotal(items: ResolvedItem[]): Prisma.Decimal {
  return items.reduce((acc, item) => {
    const itemTotal = item.unitPrice.mul(item.quantity);
    const addonsTotal = item.addons.reduce(
      (s, addon) => s.add(addon.unitPrice.mul(addon.quantity)),
      ZERO,
    );
    return acc.add(itemTotal).add(addonsTotal);
  }, ZERO);
}

export function calculateOrderTotal(
  subtotal: Prisma.Decimal,
  parts: {
    discount?: Prisma.Decimal | null;
    serviceCharge?: Prisma.Decimal | null;
    tax?: Prisma.Decimal | null;
    deliveryFee?: Prisma.Decimal | null;
  },
): Prisma.Decimal {
  const negatives = parts.discount ?? ZERO;
  const positives = (parts.serviceCharge ?? ZERO)
    .add(parts.tax ?? ZERO)
    .add(parts.deliveryFee ?? ZERO);
  return subtotal.sub(negatives).add(positives);
}

export type OrderStatusTransition = OrderStatusValue;

const STATUS_TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['finished'],
  finished: [],
  cancelled: [],
};

export function canTransition(
  current: OrderStatusValue,
  next: OrderStatusValue,
  type: OrderTypeValue,
): boolean {
  if (!STATUS_TRANSITIONS[current].includes(next)) return false;
  if (type === 'dine_in' && next === 'out_for_delivery') return false;
  if (type === 'delivery' && current === 'ready' && next === 'delivered') return false;
  return true;
}

export const ACTIVE_ORDER_STATUSES: OrderStatusValue[] = [
  'pending',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
];

export type DecimalLike = Prisma.Decimal | string | number | null | undefined;

export function decimalOrNull(value: DecimalLike): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return new Prisma.Decimal(value).toFixed(2);
  if (typeof value === 'number') return new Prisma.Decimal(value).toFixed(2);
  return value.toFixed(2);
}

export function startOfDayUTC(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
