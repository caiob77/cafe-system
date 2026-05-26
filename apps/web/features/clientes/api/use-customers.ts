'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import type { CreateCustomerPayload, Customer, UpdateCustomerPayload } from '../types';
import { customerKeys } from './keys';

type ListOptions = { search?: string; limit?: number };

function buildQueryString(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value.length > 0) params.append(key, value);
  }
  const qs = params.toString();
  return qs.length > 0 ? `?${qs}` : '';
}

export function useCustomers(options: ListOptions = {}) {
  const filters: Record<string, string | undefined> = {
    search: options.search?.trim() ? options.search.trim() : undefined,
    limit: options.limit ? String(options.limit) : undefined,
  };

  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: () =>
      apiClient<{ data: Customer[] }>(`/api/v1/customers${buildQueryString(filters)}`).then(
        (res) => res.data,
      ),
    staleTime: 15_000,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) =>
      apiClient<{ data: Customer }>('/api/v1/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateCustomerPayload & { id: string }) =>
      apiClient<{ data: Customer }>(`/api/v1/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ data: Customer }>(`/api/v1/customers/${id}`, { method: 'DELETE' }).then(
        (res) => res.data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}
