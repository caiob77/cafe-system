'use client';

import { formatPrice } from '@/features/cardapio/utils/format-price';

import type { PublicStoreProduct } from '../types';

const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';

type MenuListProps = {
  categoryName: string | null;
  products: PublicStoreProduct[];
  onOpen: (product: PublicStoreProduct) => void;
};

export function MenuList({ categoryName, products, onOpen }: MenuListProps) {
  if (products.length === 0) {
    return (
      <p className="px-4 py-10 text-sm text-muted-foreground lg:px-8">Nada nesta categoria.</p>
    );
  }

  return (
    <section className="store-reveal px-4 pb-6 pt-5 lg:px-8">
      {categoryName ? (
        <h2 className="font-display text-[1.75rem] font-medium leading-none tracking-[-0.02em]">
          {categoryName}
        </h2>
      ) : null}
      <ul className={categoryName ? 'mt-4 border-t border-[hsl(var(--line))]' : 'border-t border-[hsl(var(--line))]'}>
        {products.map((product) => (
          <li key={product.id}>
            <button
              className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 border-b border-[hsl(var(--line))] py-3.5 text-left hover:bg-muted/50 ${focusRing}`}
              onClick={() => onOpen(product)}
              type="button"
            >
              <span className="min-w-0">
                <span className="block break-words text-[1.05rem] font-semibold leading-snug">{product.name}</span>
                {product.description ? (
                  <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">
                    {product.description}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 self-start pt-0.5 text-sm font-semibold tabular-nums">
                {formatPrice(product.price)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
