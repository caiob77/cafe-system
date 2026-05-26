export type OrderType = 'dine_in' | 'delivery';
export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'finished'
  | 'cancelled';

export type OrderItemAddon = {
  id: string;
  productAddonId: string;
  addonNameSnapshot: string;
  quantity: number;
  unitPrice: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitPrice: string;
  notes: string | null;
  createdAt: string;
  addons: OrderItemAddon[];
};

export type Order = {
  id: string;
  organizationId: string;
  idempotencyKey: string;
  dailyNumber: number;
  orderDate: string;
  type: OrderType;
  status: OrderStatus;
  version: number;
  tableId: string | null;
  customerId: string | null;
  subtotal: string;
  discountAmount: string | null;
  serviceChargeAmount: string | null;
  taxAmount: string | null;
  deliveryFee: string | null;
  total: string;
  currency: string;
  notes: string | null;
  kitchenNotes: string | null;
  deliveryAddress: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  cancelledById: string | null;
  table: { id: string; number: number; capacity: number } | null;
  customer: { id: string; name: string; phone: string } | null;
  items: OrderItem[];
};

export type DraftOrderItemAddon = {
  productAddonId: string;
  name: string;
  unitPrice: string;
  quantity: number;
};

export type DraftOrderItem = {
  tempId: string;
  productId: string;
  productName: string;
  unitPrice: string;
  quantity: number;
  notes: string | null;
  addons: DraftOrderItemAddon[];
};

export type CreateOrderPayload = {
  type: OrderType;
  tableId?: string | null;
  customerId?: string | null;
  deliveryAddress?: string | null;
  notes?: string | null;
  kitchenNotes?: string | null;
  idempotencyKey?: string;
  items: Array<{
    productId: string;
    quantity: number;
    notes?: string | null;
    addons?: Array<{ productAddonId: string; quantity?: number }>;
  }>;
};

export type UpdateOrderStatusPayload = {
  status: OrderStatus;
  version: number;
  cancelReason?: string;
};
