export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
};

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: { categoryId?: string }) => [...productKeys.lists(), filters] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
};

export const addonKeys = {
  all: ['addons'] as const,
  list: (productId: string) => [...addonKeys.all, 'list', productId] as const,
};
