'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import type { AddonInput, ProductAddon } from '../types';
import { addonKeys, productKeys } from './keys';

export function useProductAddons(productId: string | null) {
  return useQuery({
    queryKey: productId ? addonKeys.list(productId) : ['addons', 'list', 'null'],
    queryFn: () =>
      apiClient<{ data: ProductAddon[] }>(`/api/v1/products/${productId}/addons`).then(
        (res) => res.data,
      ),
    enabled: Boolean(productId),
    staleTime: 30_000,
  });
}

function invalidateProduct(queryClient: ReturnType<typeof useQueryClient>, productId: string) {
  queryClient.invalidateQueries({ queryKey: addonKeys.list(productId) });
  queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
}

export function useCreateProductAddon(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddonInput) =>
      apiClient<{ data: ProductAddon }>(`/api/v1/products/${productId}/addons`, {
        method: 'POST',
        body: JSON.stringify(input),
      }).then((res) => res.data),
    onSuccess: () => invalidateProduct(queryClient, productId),
  });
}

export function useUpdateProductAddon(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: AddonInput & { id: string }) =>
      apiClient<{ data: ProductAddon }>(`/api/v1/products/${productId}/addons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }).then((res) => res.data),
    onSuccess: () => invalidateProduct(queryClient, productId),
  });
}

export function useDeleteProductAddon(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: ProductAddon }>(`/api/v1/products/${productId}/addons/${id}`, {
        method: 'DELETE',
      }).then((res) => res.data),
    onSuccess: () => invalidateProduct(queryClient, productId),
  });
}
