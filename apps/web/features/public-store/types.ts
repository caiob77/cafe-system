export type PublicStoreCategory = {
  id: string;
  name: string;
  sortOrder: number;
};

export type PublicStoreAddon = {
  id: string;
  name: string;
  price: string;
};

export type PublicStoreProduct = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  sortOrder: number;
  addons: PublicStoreAddon[];
};

export type PublicStoreMenu = {
  organization: {
    name: string;
    slug: string;
    logo: string | null;
    addressLine: string | null;
    phone: string | null;
  };
  delivery: {
    deliveryEnabled: boolean;
    deliveryOpen: boolean;
    deliverySchedule: unknown;
    defaultDeliveryFee: string | null;
  };
  categories: PublicStoreCategory[];
  products: PublicStoreProduct[];
};

export type PublicDeliverySettings = {
  deliveryEnabled: boolean;
  deliveryOpen: boolean;
  defaultDeliveryFee: string | null;
  neighborhoods: Array<{
    id: string;
    neighborhood: string;
    fee: string;
  }>;
};

export type PublicOrderPayload = {
  customer: {
    name: string;
    phone: string;
    address: string;
    neighborhood: string;
    reference: string | null;
  };
  items: Array<{
    productId: string;
    quantity: number;
    notes?: string | null;
    addons: Array<{ productAddonId: string; quantity: number }>;
  }>;
  notes: string | null;
  idempotencyKey: string;
};

export type PublicOrderResponse = {
  id: string;
  dailyNumber: number;
  total: string;
  deliveryFee: string | null;
};

export type PublicCartAddon = {
  productAddonId: string;
  name: string;
  unitPrice: string;
  quantity: number;
};

export type PublicCartItem = {
  tempId: string;
  productId: string;
  productName: string;
  unitPrice: string;
  quantity: number;
  notes: string | null;
  addons: PublicCartAddon[];
};
