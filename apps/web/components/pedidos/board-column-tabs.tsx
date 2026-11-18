'use client';

import { cn } from '@/lib/utils';

type BoardColumnTab<T extends string> = {
  value: T;
  label: string;
  count: number;
};

type BoardColumnTabsProps<T extends string> = {
  columns: BoardColumnTab<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/**
 * Seletor de colunas do quadro para telas pequenas. No celular mostramos uma coluna
 * por vez (com contador), em vez de empilhar todas e obrigar a rolar muito.
 */
export function BoardColumnTabs<T extends string>({
  columns,
  value,
  onChange,
  className,
}: BoardColumnTabsProps<T>) {
  return (
    <div
      className={cn(
        'sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden',
        className,
      )}
    >
      <div
        className="scrollbar-none flex gap-1 overflow-x-auto rounded-lg bg-muted/60 p-1"
        role="tablist"
      >
        {columns.map((column) => {
          const active = column.value === value;
          return (
            <button
              aria-selected={active}
              className={cn(
                'flex h-10 min-w-0 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors',
                active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
              )}
              key={column.value}
              onClick={() => onChange(column.value)}
              role="tab"
              type="button"
            >
              {column.label}
              <span
                className={cn(
                  'min-w-5 rounded-full px-1.5 text-xs tabular-nums',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground',
                )}
              >
                {column.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function firstNonEmptyColumn<T extends string>(
  columns: readonly T[],
  grouped: Map<T, unknown[]>,
): T {
  return columns.find((column) => (grouped.get(column)?.length ?? 0) > 0) ?? (columns[0] as T);
}
