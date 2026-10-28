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
      className="sticky top-0 z-10 border-b border-[hsl(var(--line))] bg-background"
    >
      <div className="flex gap-4 overflow-x-auto px-4 py-3 lg:px-8">
        {categories.map((category) => {
          const selected = category.id === selectedId;
          return (
            <button
              aria-pressed={selected}
              className={cn(
                'inline-flex h-11 shrink-0 items-center border-b-2 px-1 text-base',
                focusRing,
                selected
                  ? 'border-foreground font-semibold text-foreground'
                  : 'border-transparent text-muted-foreground',
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
