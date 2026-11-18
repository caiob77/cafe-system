'use client';

import { ImageOff, Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

import type { Product } from '@/features/cardapio/types';
import { formatPrice } from '@/features/cardapio/utils/format-price';

type ProductCardProps = {
  product: Product;
  canManage: boolean;
  canToggleAvailability: boolean;
  togglingAvailability: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleAvailability: (product: Product, available: boolean) => void;
};

export function ProductCard({
  product,
  canManage,
  canToggleAvailability,
  togglingAvailability,
  onEdit,
  onDelete,
  onToggleAvailability,
}: ProductCardProps) {
  return (
    <article
      className={cn(
        'flex flex-row overflow-hidden rounded-lg border bg-card shadow-sm transition-opacity sm:flex-col',
        !product.available && 'opacity-70',
      )}
    >
      <div className="relative w-24 shrink-0 self-stretch bg-muted sm:aspect-[4/3] sm:w-full sm:self-auto">
        {product.imageUrl ? (
          <img
            alt={product.name}
            className="absolute inset-0 h-full w-full object-cover sm:static"
            loading="lazy"
            src={product.imageUrl}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
        )}
        {!product.available ? (
          <Badge className="absolute right-2 top-2 hidden sm:inline-flex" variant="destructive">
            Esgotado
          </Badge>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight">{product.name}</h3>
          <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-primary">
            {formatPrice(product.price)}
          </span>
        </div>

        {product.description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
        ) : null}

        <div className="-mb-1 mt-auto flex items-center justify-between gap-2 pt-1 sm:mb-0 sm:pt-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Switch
              aria-label="Alternar disponibilidade"
              checked={product.available}
              disabled={!canToggleAvailability || togglingAvailability}
              onCheckedChange={(checked) => onToggleAvailability(product, checked)}
            />
            <span>{product.available ? 'Disponível' : 'Esgotado'}</span>
          </div>

          {canManage ? (
            <div className="flex items-center gap-1">
              <Button
                aria-label={`Editar ${product.name}`}
                onClick={() => onEdit(product)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                aria-label={`Remover ${product.name}`}
                onClick={() => onDelete(product)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
