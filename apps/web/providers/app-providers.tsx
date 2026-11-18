'use client';

import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { Toaster } from '@/components/ui/sonner';

import { QueryProvider } from './query-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
      <Toaster />
    </QueryProvider>
  );
}
