'use client';

import { Package } from 'lucide-react';

import { formatPrice } from '@/features/cardapio/utils/format-price';

import type { ProductsReport } from '@/features/relatorios/types';

export function TopProducts({ data }: { data?: ProductsReport }) {
  if (!data || data.items.length === 0) {
    return (
      <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
        Sem vendas registradas no período.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y rounded-md border bg-card">
      {data.items.map((item, index) => (
        <li className="flex items-center gap-3 px-3 py-2.5" key={item.productId}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
            {index + 1}
          </div>
          <div className="flex flex-1 flex-col">
            <span className="text-sm font-medium">{item.name}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Package className="h-3 w-3" />
              {item.quantity} unidade{item.quantity === 1 ? '' : 's'}
            </span>
          </div>
          <span className="text-sm font-semibold">{formatPrice(item.revenue)}</span>
        </li>
      ))}
    </ul>
  );
}
