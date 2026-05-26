'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import { orderKeys } from '@/features/pedidos/api/keys';

import type { Table, TableInput } from '../types';
import { tableKeys } from './keys';

export function useTables(options?: { refetchIntervalMs?: number }) {
  return useQuery({
    queryKey: tableKeys.lists(),
    queryFn: () => apiClient<{ data: Table[] }>('/api/v1/tables').then((res) => res.data),
    staleTime: 5_000,
    refetchInterval: options?.refetchIntervalMs ?? false,
  });
}

export function useCreateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TableInput) =>
      apiClient<{ data: Table }>('/api/v1/tables', {
        method: 'POST',
        body: JSON.stringify(input),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tableKeys.lists() });
    },
  });
}

export function useUpdateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: TableInput & { id: string }) =>
      apiClient<{ data: Table }>(`/api/v1/tables/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tableKeys.lists() });
    },
  });
}

export function useDeleteTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: Table }>(`/api/v1/tables/${id}`, {
        method: 'DELETE',
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tableKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
