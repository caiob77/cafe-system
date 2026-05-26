'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import { orderKeys } from '@/features/pedidos/api/keys';
import type { Order, OrderStatus } from '@/features/pedidos/types';

const KITCHEN_STATUSES: OrderStatus[] = ['pending', 'preparing', 'ready'];

export function useKitchenOrders() {
  const filters = { kitchen: 'true' };

  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: async () => {
      const res = await apiClient<{ data: Order[] }>('/api/v1/orders?active=true');
      return res.data.filter((order) => KITCHEN_STATUSES.includes(order.status));
    },
    staleTime: 3_000,
  });
}
