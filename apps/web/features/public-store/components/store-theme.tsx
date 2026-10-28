'use client';

import { createContext, useContext, useState } from 'react';

import { cn } from '@/lib/utils';

const StorePortalContext = createContext<HTMLElement | null>(null);

export function useStorePortal() {
  return useContext(StorePortalContext);
}

type StoreThemeProps = {
  className?: string;
  children: React.ReactNode;
};

export function StoreTheme({ className, children }: StoreThemeProps) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  return (
    <StorePortalContext.Provider value={node}>
      <div className={cn('min-h-dvh', className)} data-theme="store" ref={setNode}>
        {children}
      </div>
    </StorePortalContext.Provider>
  );
}
