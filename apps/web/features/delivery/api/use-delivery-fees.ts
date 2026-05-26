'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import type { CreateDeliveryFeePayload, DeliveryFee, UpdateDeliveryFeePayload } from '../types';
import { deliveryFeeKeys } from './keys';

export function useDeliveryFees() {
  return useQuery({
    queryKey: deliveryFeeKeys.lists(),
    queryFn: () =>
      apiClient<{ data: DeliveryFee[] }>('/api/v1/delivery-fees').then((res) => res.data),
    staleTime: 60_000,
  });
}

export function useCreateDeliveryFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDeliveryFeePayload) =>
      apiClient<{ data: DeliveryFee }>('/api/v1/delivery-fees', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryFeeKeys.all });
    },
  });
}

export function useUpdateDeliveryFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateDeliveryFeePayload & { id: string }) =>
      apiClient<{ data: DeliveryFee }>(`/api/v1/delivery-fees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryFeeKeys.all });
    },
  });
}

export function useDeleteDeliveryFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: DeliveryFee }>(`/api/v1/delivery-fees/${id}`, {
        method: 'DELETE',
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryFeeKeys.all });
    },
  });
}
