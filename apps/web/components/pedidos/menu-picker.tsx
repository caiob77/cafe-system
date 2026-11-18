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
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="scrollbar-none flex gap-2 overflow-x-auto sm:flex-wrap">
          {categories.map((category) => (
            <Button
              className="shrink-0 rounded-full sm:rounded-md"
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
          {filtered.map((product) => {
            const disabled = !product.available;
            return (
              <button
                className={cn(
                  'flex flex-col overflow-hidden rounded-lg border bg-card text-left shadow-sm transition-[box-shadow,transform] duration-100 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]',
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
                <div className="flex flex-1 flex-col gap-1 p-2.5 sm:p-3">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
                    {product.name}
                  </h3>
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
