'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import type { Category, CategoryInput } from '../types';
import { categoryKeys, productKeys } from './keys';

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.lists(),
    queryFn: () => apiClient<{ data: Category[] }>('/api/v1/categories').then((res) => res.data),
    staleTime: 60_000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) =>
      apiClient<{ data: Category }>('/api/v1/categories', {
        method: 'POST',
        body: JSON.stringify(input),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: CategoryInput & { id: string }) =>
      apiClient<{ data: Category }>(`/api/v1/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: Category }>(`/api/v1/categories/${id}`, {
        method: 'DELETE',
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiClient<{ data: Category[] }>('/api/v1/categories/reorder', {
        method: 'PUT',
        body: JSON.stringify({ ids }),
      }).then((res) => res.data),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.lists() });
      const previous = queryClient.getQueryData<Category[]>(categoryKeys.lists());
      if (previous) {
        const map = new Map(previous.map((c) => [c.id, c]));
        const optimistic = ids
          .map((id, index) => {
            const existing = map.get(id);
            return existing ? { ...existing, sortOrder: index } : null;
          })
          .filter((c): c is Category => c !== null);
        queryClient.setQueryData(categoryKeys.lists(), optimistic);
      }
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(categoryKeys.lists(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
}
