'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import type {
  CashMovementPayload,
  CashRegister,
  CloseCashRegisterPayload,
  OpenCashRegisterPayload,
} from '../types';
import { cashRegisterKeys } from './keys';

export function useCurrentCashRegister() {
  return useQuery({
    queryKey: cashRegisterKeys.current(),
    queryFn: () =>
      apiClient<{ data: CashRegister | null }>('/api/v1/cash-registers/current').then(
        (res) => res.data,
      ),
    staleTime: 10_000,
  });
}

export function useCashRegister(id: string | null) {
  return useQuery({
    queryKey: id ? cashRegisterKeys.detail(id) : ['cash-registers', 'detail', 'null'],
    queryFn: () =>
      apiClient<{ data: CashRegister }>(`/api/v1/cash-registers/${id}`).then((res) => res.data),
    enabled: id !== null,
    staleTime: 10_000,
  });
}

export function useOpenCashRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OpenCashRegisterPayload) =>
      apiClient<{ data: CashRegister }>('/api/v1/cash-registers/open', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.all });
    },
  });
}

export function useCloseCashRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CloseCashRegisterPayload) =>
      apiClient<{ data: CashRegister }>('/api/v1/cash-registers/close', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.all });
    },
  });
}

export function useCreateCashMovement(registerId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CashMovementPayload) => {
      if (!registerId) throw new Error('Caixa não definido');
      return apiClient<{ data: CashRegister }>(
        `/api/v1/cash-registers/${registerId}/movements`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      ).then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.all });
    },
  });
}
