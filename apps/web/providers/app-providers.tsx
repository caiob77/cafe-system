'use client';

import { QueryProvider } from './query-provider';
import { StoreProvider } from './store-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <QueryProvider>{children}</QueryProvider>
    </StoreProvider>
  );
}
