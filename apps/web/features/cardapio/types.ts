export type Category = {
  id: string;
  organizationId: string;
  name: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type Product = {
  id: string;
  organizationId: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  imagePublicId: string | null;
  available: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ProductAddon = {
  id: string;
  organizationId: string;
  productId: string;
  name: string;
  price: string;
  available: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ProductWithAddons = Product & { addons: ProductAddon[] };

export type CategoryInput = {
  name: string;
  sortOrder?: number;
  active?: boolean;
};

export type ProductInput = {
  categoryId: string;
  name: string;
  description?: string | null;
  price: string;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  available?: boolean;
  sortOrder?: number;
};

export type AddonInput = {
  name: string;
  price: string;
  available?: boolean;
};
