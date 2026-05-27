'use client';

import { ImageOff, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { Category, Product } from '@/features/cardapio/types';
import { formatPrice } from '@/features/cardapio/utils/format-price';

type MenuPickerProps = {
  categories: Category[];
  products: Product[];
  selectedCategoryId: string | null;
  loading: boolean;
  onSelectCategory: (id: string) => void;
  onSelectProduct: (product: Product) => void;
};

export function MenuPicker({
  categories,
  products,
  selectedCategoryId,
  loading,
  onSelectCategory,
  onSelectProduct,
}: MenuPickerProps) {
  const filtered = selectedCategoryId
    ? products.filter((product) => product.categoryId === selectedCategoryId)
    : products;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            size="touch"
            type="button"
            variant={category.id === selectedCategoryId ? 'default' : 'secondary'}
          >
            {category.name}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          Nenhum produto nesta categoria.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map((product) => {
            const disabled = !product.available;
            return (
              <button
                className={cn(
                  'flex flex-col overflow-hidden rounded-lg border bg-card text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  disabled && 'cursor-not-allowed opacity-60',
                )}
                disabled={disabled}
                key={product.id}
                onClick={() => onSelectProduct(product)}
                type="button"
              >
                <div className="relative aspect-[4/3] w-full bg-muted">
                  {product.imageUrl ? (
                    <img
                      alt={product.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      src={product.imageUrl}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageOff className="h-7 w-7" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <h3 className="line-clamp-2 text-sm font-semibold">{product.name}</h3>
                  <span className="text-sm font-semibold text-primary">
                    {formatPrice(product.price)}
                  </span>
                  {disabled ? (
                    <span className="mt-auto text-xs font-medium text-destructive">Esgotado</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
