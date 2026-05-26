'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import { tableKeys } from '@/features/mesas/api/keys';

import type { CreateOrderPayload, Order, UpdateOrderStatusPayload } from '../types';
import { orderKeys } from './keys';

type ListOptions = {
  active?: boolean;
  tableId?: string;
  refetchIntervalMs?: number;
};

function buildQueryString(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) params.append(key, value);
  }
  const qs = params.toString();
  return qs.length > 0 ? `?${qs}` : '';
}

export function useOrders(options: ListOptions = {}) {
  const filters: Record<string, string | undefined> = {
    active: options.active === undefined ? undefined : String(options.active),
    tableId: options.tableId,
  };

  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () =>
      apiClient<{ data: Order[] }>(`/api/v1/orders${buildQueryString(filters)}`).then(
        (res) => res.data,
      ),
    staleTime: 3_000,
    refetchInterval: options.refetchIntervalMs ?? false,
  });
}

export function useOrder(id: string | null) {
  return useQuery({
    queryKey: id ? orderKeys.detail(id) : ['orders', 'detail', 'null'],
    queryFn: () => apiClient<{ data: Order }>(`/api/v1/orders/${id}`).then((res) => res.data),
    enabled: id !== null,
    staleTime: 3_000,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) =>
      apiClient<{ data: Order }>('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: tableKeys.lists() });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateOrderStatusPayload & { id: string }) =>
      apiClient<{ data: Order }>(`/api/v1/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }).then((res) => res.data),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(order.id) });
      queryClient.invalidateQueries({ queryKey: tableKeys.lists() });
    },
  });
}
