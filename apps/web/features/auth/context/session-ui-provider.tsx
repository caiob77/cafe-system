'use client';

import { createContext, useContext, useMemo } from 'react';

import type { CurrentUserResponse } from '@/lib/server-api';

type SessionUIContextValue = CurrentUserResponse['data'];

const SessionUIContext = createContext<SessionUIContextValue | null>(null);

export function SessionUIProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: SessionUIContextValue;
}) {
  const value = useMemo(() => session, [session]);

  return <SessionUIContext.Provider value={value}>{children}</SessionUIContext.Provider>;
}

export function useSessionUI() {
  const context = useContext(SessionUIContext);
  if (!context) {
    throw new Error('useSessionUI must be used within SessionUIProvider');
  }

  return context;
}
