'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Minus, Plus } from 'lucide-react';

import { formatPrice } from '@/features/cardapio/utils/format-price';
import { cn } from '@/lib/utils';

import { moneyToNumber } from '../cart';
import type { PublicStoreProduct } from '../types';
import { customerLimits } from '../validation';

const iconButton =
  'inline-flex h-11 w-11 items-center justify-center border border-input bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40';

type ItemSheetProps = {
  container: HTMLElement;
  product: PublicStoreProduct;
  quantity: number;
  notes: string;
  addons: Record<string, number>;
  onQuantity: (quantity: number) => void;
  onNotes: (notes: string) => void;
  onAddon: (addonId: string, quantity: number) => void;
  onClose: () => void;
  onAdd: () => void;
};

export function ItemSheet({
  container,
  product,
  quantity,
  notes,
  addons,
  onQuantity,
  onNotes,
  onAddon,
  onClose,
  onAdd,
}: ItemSheetProps) {
  const selectedAddonCount = Object.values(addons).filter((value) => value > 0).length;
  const addonLimitReached = selectedAddonCount >= 20;
  const addonsTotal = product.addons.reduce(
    (sum, addon) => sum + moneyToNumber(addon.price) * (addons[addon.id] ?? 0),
    0,
  );
  const total = (moneyToNumber(product.price) + addonsTotal) * quantity;

  return (
    <Dialog.Root onOpenChange={(open) => !open && onClose()} open>
      <Dialog.Portal container={container}>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/40" />
        <Dialog.Content
          className="store-sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[min(92dvh,40rem)] flex-col bg-card outline-none lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-full lg:max-w-md lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-lg"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus();
          }}
          tabIndex={-1}
        >
          <div className="flex items-start justify-between gap-3 border-b border-[hsl(var(--line))] px-4 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold leading-snug">
                {product.name}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm tabular-nums text-muted-foreground">
                {formatPrice(product.price)}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="inline-flex h-11 shrink-0 items-center px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              type="button"
            >
              Fechar
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium" id="store-item-quantity-label">
                Quantidade
              </span>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Diminuir quantidade"
                  className={iconButton}
                  onClick={() => onQuantity(Math.max(1, quantity - 1))}
                  type="button"
                >
                  <Minus aria-hidden="true" className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-semibold tabular-nums">{quantity}</span>
                <button
                  aria-label="Aumentar quantidade"
                  className={iconButton}
                  onClick={() => onQuantity(Math.min(99, quantity + 1))}
                  type="button"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </div>

            {product.addons.length > 0 ? (
              <fieldset className="mt-6">
                <legend className="text-sm font-medium">Adicionais por unidade</legend>
                <ul className="mt-2">
                  {product.addons.map((addon) => {
                    const addonQuantity = addons[addon.id] ?? 0;
                    const cannotAdd = addonQuantity === 0 && addonLimitReached;
                    return (
                      <li
                        className="flex items-center justify-between gap-3 border-b border-[hsl(var(--line))] py-2"
                        key={addon.id}
                      >
                        <span>
                          <span className="block text-sm font-medium">{addon.name}</span>
                          <span className="block text-sm tabular-nums text-muted-foreground">
                            +{formatPrice(addon.price)}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <button
                            aria-label={`Diminuir ${addon.name}`}
                            className={iconButton}
                            onClick={() => onAddon(addon.id, Math.max(0, addonQuantity - 1))}
                            type="button"
                          >
                            <Minus aria-hidden="true" className="h-4 w-4" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold tabular-nums">
                            {addonQuantity}
                          </span>
                          <button
                            aria-label={`Aumentar ${addon.name}`}
                            className={iconButton}
                            disabled={cannotAdd}
                            onClick={() => onAddon(addon.id, Math.min(99, addonQuantity + 1))}
                            type="button"
                          >
                            <Plus aria-hidden="true" className="h-4 w-4" />
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {quantity > 1 && selectedAddonCount > 0 ? (
                  <output className="mt-2 block border border-[hsl(var(--line))] bg-muted/40 px-3 py-2 text-sm">
                    Os adicionais valem para cada uma das {quantity} unidades. Se só algumas levam
                    adicional, adicione essas unidades separadas.
                  </output>
                ) : null}
                {addonLimitReached ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Dá para incluir até 20 adicionais.
                  </p>
                ) : null}
              </fieldset>
            ) : null}

            <label className="mt-6 block text-sm font-medium" htmlFor="store-item-notes">
              Observação do item
              <textarea
                className="mt-1 flex min-h-20 w-full border border-input bg-card px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                id="store-item-notes"
                maxLength={customerLimits.itemNotes}
                onChange={(event) => onNotes(event.target.value)}
                rows={2}
                value={notes}
              />
            </label>
          </div>

          <div className="border-t border-[hsl(var(--line))] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              className={cn(
                'inline-flex h-12 w-full items-center justify-between bg-primary px-4 text-base font-semibold text-primary-foreground',
                'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
              )}
              onClick={onAdd}
              type="button"
            >
              <span>Adicionar</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
