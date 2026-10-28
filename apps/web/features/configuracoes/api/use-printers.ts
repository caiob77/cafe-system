'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import type { CreatedPrinterDevice, PrinterDevice } from '../types';

export const printerKeys = {
  all: ['printer-devices'] as const,
  list: () => [...printerKeys.all, 'list'] as const,
};

export function usePrinters() {
  return useQuery({
    queryKey: printerKeys.list(),
    queryFn: () =>
      apiClient<{ data: PrinterDevice[] }>('/api/v1/printer-devices').then((res) => res.data),
    staleTime: 15_000,
  });
}

export function useCreatePrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      apiClient<{ data: CreatedPrinterDevice }>('/api/v1/printer-devices', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: printerKeys.all });
    },
  });
}

export function useRevokePrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient(`/api/v1/printer-devices/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: printerKeys.all });
    },
  });
}
