'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import type { Product, ProductInput, ProductWithAddons } from '../types';
import { addonKeys, productKeys } from './keys';

export function useProducts(filters: { categoryId?: string } = {}) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.categoryId) params.set('categoryId', filters.categoryId);
      const qs = params.toString();
      return apiClient<{ data: Product[] }>(`/api/v1/products${qs ? `?${qs}` : ''}`).then(
        (res) => res.data,
      );
    },
    staleTime: 30_000,
  });
}

export function useProductDetail(id: string | null) {
  return useQuery({
    queryKey: id ? productKeys.detail(id) : ['products', 'detail', 'null'],
    queryFn: () =>
      apiClient<{ data: ProductWithAddons }>(`/api/v1/products/${id}`).then((res) => res.data),
    enabled: Boolean(id),
    staleTime: 10_000,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductInput) =>
      apiClient<{ data: Product }>('/api/v1/products', {
        method: 'POST',
        body: JSON.stringify(input),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: ProductInput & { id: string }) =>
      apiClient<{ data: Product }>(`/api/v1/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }).then((res) => res.data),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(product.id) });
    },
  });
}

export function useUpdateProductAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      apiClient<{ data: Product }>(`/api/v1/products/${id}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ available }),
      }).then((res) => res.data),
    onMutate: async ({ id, available }) => {
      await queryClient.cancelQueries({ queryKey: productKeys.lists() });
      const snapshots = queryClient.getQueriesData<Product[]>({
        queryKey: productKeys.lists(),
      });
      for (const [key, products] of snapshots) {
        if (!products) continue;
        queryClient.setQueryData(
          key,
          products.map((p) => (p.id === id ? { ...p, available } : p)),
        );
      }
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      for (const [key, products] of context.snapshots) {
        queryClient.setQueryData(key, products);
      }
    },
    onSettled: (product) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      if (product) {
        queryClient.invalidateQueries({ queryKey: productKeys.detail(product.id) });
      }
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: Product }>(`/api/v1/products/${id}`, {
        method: 'DELETE',
      }).then((res) => res.data),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(product.id) });
      queryClient.invalidateQueries({ queryKey: addonKeys.list(product.id) });
    },
  });
}
