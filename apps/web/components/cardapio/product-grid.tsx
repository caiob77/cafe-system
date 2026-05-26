'use client';

import { Plus, UtensilsCrossed } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { Category, Product } from '@/features/cardapio/types';

import { ProductCard } from './product-card';

type ProductGridProps = {
  category: Category | null;
  products: Product[];
  loading: boolean;
  canManage: boolean;
  canToggleAvailability: boolean;
  togglingId: string | null;
  onCreate: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleAvailability: (product: Product, available: boolean) => void;
};

export function ProductGrid({
  category,
  products,
  loading,
  canManage,
  canToggleAvailability,
  togglingId,
  onCreate,
  onEdit,
  onDelete,
  onToggleAvailability,
}: ProductGridProps) {
  if (!category) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <UtensilsCrossed className="h-10 w-10" />
        <p className="text-sm">Selecione uma categoria à esquerda para ver os produtos.</p>
      </div>
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{category.name}</h2>
          <p className="text-xs text-muted-foreground">
            {products.length} {products.length === 1 ? 'produto' : 'produtos'}
          </p>
        </div>
        {canManage ? (
          <Button onClick={onCreate} type="button">
            <Plus className="h-4 w-4" />
            Novo produto
          </Button>
        ) : null}
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div className="h-64 animate-pulse rounded-lg border bg-muted/30" key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p className="text-sm">Nenhum produto cadastrado nesta categoria.</p>
          {canManage ? (
            <Button onClick={onCreate} type="button" variant="default">
              <Plus className="h-4 w-4" />
              Adicionar produto
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              canManage={canManage}
              canToggleAvailability={canToggleAvailability}
              key={product.id}
              onDelete={onDelete}
              onEdit={onEdit}
              onToggleAvailability={onToggleAvailability}
              product={product}
              togglingAvailability={togglingId === product.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
