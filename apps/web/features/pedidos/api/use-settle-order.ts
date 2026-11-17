'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import { cashRegisterKeys } from '@/features/caixa/api/keys';
import { tableKeys } from '@/features/mesas/api/keys';
import { reportKeys } from '@/features/relatorios/api/keys';

import type { Order } from '../types';
import { orderKeys } from './keys';
import { useUpdateOrderStatus } from './use-orders';

export type SettlementMethod = 'cash' | 'credit_card' | 'debit_card' | 'pix';

type SettleOrderInput = {
  order: Order;
  method: SettlementMethod | null;
};

export function useSettleOrder() {
  const queryClient = useQueryClient();
  const updateStatus = useUpdateOrderStatus();

  return useMutation({
    mutationFn: async ({ order, method }: SettleOrderInput) => {
      if (Number(order.total) > 0) {
        if (!method) {
          throw new Error('Selecione o método de pagamento.');
        }
        await apiClient(`/api/v1/orders/${order.id}/payments`, {
          method: 'POST',
          body: JSON.stringify({
            method,
            amount: order.total,
            idempotencyKey: `settle-${order.id}-v${order.version}`,
          }),
        });
        return;
      }

      let current = order;
      if (current.type === 'delivery' && current.status !== 'delivered') {
        current = await updateStatus.mutateAsync({
          id: current.id,
          status: 'delivered',
          version: current.version,
        });
      }
      if (current.status !== 'finished') {
        await updateStatus.mutateAsync({
          id: current.id,
          status: 'finished',
          version: current.version,
        });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
      void queryClient.invalidateQueries({ queryKey: tableKeys.all });
      void queryClient.invalidateQueries({ queryKey: cashRegisterKeys.all });
      void queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}
