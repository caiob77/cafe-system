import type { Prisma } from '@cafe/db';
import type { KitchenTicketPayload, PaymentMethodValue, ReceiptPayload } from '@cafe/shared';

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    items: { include: { addons: true } };
    table: true;
    customer: true;
  };
}>;

type PaymentRecord = Prisma.PaymentGetPayload<true>;

export function buildKitchenTicket(order: OrderWithRelations): KitchenTicketPayload {
  return {
    version: 1,
    kind: 'kitchen_ticket',
    orderId: order.id,
    dailyNumber: order.dailyNumber,
    orderType: order.type,
    tableNumber: order.table?.number ?? null,
    customerName: order.customer?.name ?? null,
    deliveryAddress: order.deliveryAddress,
    items: order.items.map((item) => ({
      name: item.productNameSnapshot,
      quantity: item.quantity,
      notes: item.notes,
      addons: item.addons.map((addon) => ({
        name: addon.addonNameSnapshot,
        quantity: addon.quantity,
      })),
    })),
    kitchenNotes: order.kitchenNotes,
    createdAt: order.createdAt.toISOString(),
  };
}

export function buildPaymentReceipt(
  order: OrderWithRelations,
  payments: PaymentRecord[],
  orgName: string,
): ReceiptPayload {
  return {
    version: 1,
    kind: 'payment_receipt',
    orderId: order.id,
    dailyNumber: order.dailyNumber,
    orgName,
    orderType: order.type,
    items: order.items.map((item) => {
      const itemTotal = item.unitPrice.mul(item.quantity);
      const addonsTotal = item.addons.reduce(
        (acc, addon) => acc.add(addon.unitPrice.mul(addon.quantity)),
        item.unitPrice.mul(0),
      );
      return {
        name: item.productNameSnapshot,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        lineTotal: itemTotal.add(addonsTotal).toFixed(2),
        notes: item.notes,
        addons: item.addons.map((addon) => ({
          name: addon.addonNameSnapshot,
          quantity: addon.quantity,
          unitPrice: addon.unitPrice.toFixed(2),
        })),
      };
    }),
    subtotal: order.subtotal.toFixed(2),
    discountAmount: order.discountAmount?.toFixed(2) ?? null,
    serviceChargeAmount: order.serviceChargeAmount?.toFixed(2) ?? null,
    taxAmount: order.taxAmount?.toFixed(2) ?? null,
    deliveryFee: order.deliveryFee?.toFixed(2) ?? null,
    total: order.total.toFixed(2),
    payments: payments.map((payment) => ({
      method: payment.method as PaymentMethodValue,
      amount: payment.amount.toFixed(2),
      changeAmount: payment.changeAmount?.toFixed(2) ?? null,
    })),
    createdAt: order.createdAt.toISOString(),
    finishedAt: (order.finishedAt ?? new Date()).toISOString(),
  };
}
