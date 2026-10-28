'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import type { CafeProfile, UpdateCafeProfilePayload } from '../types';

export const cafeProfileKeys = {
  all: ['cafe-profile'] as const,
  detail: () => [...cafeProfileKeys.all, 'detail'] as const,
};

export function useCafeProfile() {
  return useQuery({
    queryKey: cafeProfileKeys.detail(),
    queryFn: () =>
      apiClient<{ data: CafeProfile }>('/api/v1/organization/me').then((res) => res.data),
    staleTime: 30_000,
  });
}

export function useUpdateCafeProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCafeProfilePayload) =>
      apiClient<{ data: CafeProfile }>('/api/v1/organization/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }).then((res) => res.data),
    onSuccess: (profile) => {
      queryClient.setQueryData(cafeProfileKeys.detail(), profile);
    },
  });
}
