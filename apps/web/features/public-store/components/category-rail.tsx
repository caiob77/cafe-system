import { cn } from '@/lib/utils';

import type { PublicStoreCategory } from '../types';

const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';

type CategoryRailProps = {
  categories: PublicStoreCategory[];
  selectedId: string | null;
  onSelect: (categoryId: string) => void;
};

export function CategoryRail({ categories, selectedId, onSelect }: CategoryRailProps) {
  if (categories.length < 2) return null;

  return (
    <nav
      aria-label="Categorias"
      className="sticky top-0 z-10 min-w-0 border-y border-[hsl(var(--line))] bg-[hsl(var(--background)_/_0.92)] backdrop-blur-md"
    >
      <div className="flex min-w-0 gap-1 overflow-x-auto overscroll-x-contain px-3 py-2 lg:px-6">
        {categories.map((category) => {
          const selected = category.id === selectedId;
          return (
            <button
              aria-pressed={selected}
              className={cn(
                'inline-flex h-11 shrink-0 items-center px-3 text-[0.95rem] transition-colors',
                focusRing,
                selected
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
              key={category.id}
              onClick={() => onSelect(category.id)}
              type="button"
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
