'use client';

import { useState } from 'react';

import { formatPrice } from '@/features/cardapio/utils/format-price';

import type { PublicStoreProduct } from '../types';

const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';

type MenuListProps = {
  products: PublicStoreProduct[];
  onOpen: (product: PublicStoreProduct) => void;
};

export function MenuList({ products, onOpen }: MenuListProps) {
  if (products.length === 0) {
    return (
      <p className="px-4 py-10 text-sm text-muted-foreground lg:px-8">Nada nesta categoria.</p>
    );
  }

  return (
    <ul className="border-t border-[hsl(var(--line))]">
      {products.map((product) => (
        <li key={product.id}>
          <ProductRow onOpen={onOpen} product={product} />
        </li>
      ))}
    </ul>
  );
}

function ProductRow({
  product,
  onOpen,
}: {
  product: PublicStoreProduct;
  onOpen: (product: PublicStoreProduct) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(product.imageUrl) && !imageFailed;

  return (
    <button
      className={`grid w-full items-center gap-3 border-b border-[hsl(var(--line))] px-4 py-3 text-left hover:bg-muted/80 lg:px-8 ${focusRing} ${
        showImage ? 'grid-cols-[4.5rem_minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)_auto]'
      }`}
      onClick={() => onOpen(product)}
      type="button"
    >
      {showImage ? (
        <span className="relative h-[4.5rem] w-[4.5rem] overflow-hidden bg-muted">
          <img
            alt=""
            className="h-full w-full object-cover"
            height={72}
            loading="lazy"
            onError={() => setImageFailed(true)}
            src={product.imageUrl ?? ''}
            width={72}
          />
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="block text-base font-semibold leading-snug">{product.name}</span>
        {product.description ? (
          <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">
            {product.description}
          </span>
        ) : null}
      </span>
      <span className="text-sm font-semibold tabular-nums">{formatPrice(product.price)}</span>
    </button>
  );
}
