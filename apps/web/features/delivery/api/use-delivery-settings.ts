'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import type { DeliverySettings, UpdateDeliverySettingsPayload } from '../types';

export const deliverySettingsKeys = {
  all: ['delivery-settings'] as const,
  detail: () => [...deliverySettingsKeys.all, 'detail'] as const,
};

export function useDeliverySettings() {
  return useQuery({
    queryKey: deliverySettingsKeys.detail(),
    queryFn: () =>
      apiClient<{ data: DeliverySettings }>('/api/v1/organization/delivery-settings').then(
        (res) => res.data,
      ),
    staleTime: 30_000,
  });
}

export function useUpdateDeliverySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateDeliverySettingsPayload) =>
      apiClient<{ data: DeliverySettings }>('/api/v1/organization/delivery-settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliverySettingsKeys.all });
    },
  });
}
