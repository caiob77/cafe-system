'use client';

import { Loader2, Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { useProductDetail } from '@/features/cardapio/api/use-products';
import { formatPrice } from '@/features/cardapio/utils/format-price';
import type { DraftOrderItem, DraftOrderItemAddon } from '@/features/pedidos/types';

type AddonState = {
  productAddonId: string;
  name: string;
  unitPrice: string;
  selected: boolean;
  quantity: number;
};

type ItemEditorDialogProps = {
  open: boolean;
  productId: string | null;
  initialDraft: DraftOrderItem | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (draft: DraftOrderItem) => void;
};

export function ItemEditorDialog({
  open,
  productId,
  initialDraft,
  onOpenChange,
  onConfirm,
}: ItemEditorDialogProps) {
  const detailQuery = useProductDetail(productId);
  const product = detailQuery.data ?? null;

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [addons, setAddons] = useState<AddonState[]>([]);

  useEffect(() => {
    if (!open) return;
    if (!product) return;

    if (initialDraft) {
      setQuantity(initialDraft.quantity);
      setNotes(initialDraft.notes ?? '');
      setAddons(
        product.addons.map((addon) => {
          const existing = initialDraft.addons.find((a) => a.productAddonId === addon.id);
          return {
            productAddonId: addon.id,
            name: addon.name,
            unitPrice: addon.price,
            selected: Boolean(existing),
            quantity: existing?.quantity ?? 1,
          };
        }),
      );
      return;
    }

    setQuantity(1);
    setNotes('');
    setAddons(
      product.addons.map((addon) => ({
        productAddonId: addon.id,
        name: addon.name,
        unitPrice: addon.price,
        selected: false,
        quantity: 1,
      })),
    );
  }, [open, product, initialDraft]);

  function adjustQuantity(delta: number) {
    setQuantity((current) => Math.max(1, Math.min(99, current + delta)));
  }

  function toggleAddon(productAddonId: string, selected: boolean) {
    setAddons((current) =>
      current.map((addon) =>
        addon.productAddonId === productAddonId
          ? {
              ...addon,
              selected,
              quantity: selected ? Math.max(1, addon.quantity) : addon.quantity,
            }
          : addon,
      ),
    );
  }

  function adjustAddonQuantity(productAddonId: string, delta: number) {
    setAddons((current) =>
      current.map((addon) =>
        addon.productAddonId === productAddonId
          ? { ...addon, quantity: Math.max(1, Math.min(99, addon.quantity + delta)) }
          : addon,
      ),
    );
  }

  function handleConfirm() {
    if (!product) return;

    const selectedAddons: DraftOrderItemAddon[] = addons
      .filter((addon) => addon.selected)
      .map((addon) => ({
        productAddonId: addon.productAddonId,
        name: addon.name,
        unitPrice: addon.unitPrice,
        quantity: addon.quantity,
      }));

    const draft: DraftOrderItem = {
      tempId: initialDraft?.tempId ?? '',
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      quantity,
      notes: notes.trim().length > 0 ? notes.trim() : null,
      addons: selectedAddons,
    };

    onConfirm(draft);
  }

  const itemTotal = product
    ? (Number(product.price) +
        addons
          .filter((addon) => addon.selected)
          .reduce((sum, addon) => sum + Number(addon.unitPrice) * addon.quantity, 0)) *
      quantity
    : 0;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {detailQuery.isLoading ? 'Carregando...' : (product?.name ?? 'Produto')}
          </DialogTitle>
          {product?.description ? (
            <DialogDescription>{product.description}</DialogDescription>
          ) : null}
        </DialogHeader>

        {detailQuery.isLoading || !product ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Preço unitário</p>
                <p className="text-base font-semibold text-primary">{formatPrice(product.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  aria-label="Diminuir quantidade"
                  className="h-11 w-11"
                  onClick={() => adjustQuantity(-1)}
                  size="icon"
                  type="button"
                  variant="secondary"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center text-lg font-semibold tabular-nums">
                  {quantity}
                </span>
                <Button
                  aria-label="Aumentar quantidade"
                  className="h-11 w-11"
                  onClick={() => adjustQuantity(1)}
                  size="icon"
                  type="button"
                  variant="secondary"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {addons.length > 0 ? (
              <div className="space-y-2">
                <Label>Adicionais por unidade</Label>
                <ul className="space-y-2">
                  {addons.map((addon) => (
                    <li
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2',
                        addon.selected && 'border-primary/50',
                      )}
                      key={addon.productAddonId}
                    >
                      <div className="flex items-center gap-3">
                        <Switch
                          aria-label={`Adicionar ${addon.name}`}
                          checked={addon.selected}
                          onCheckedChange={(checked) => toggleAddon(addon.productAddonId, checked)}
                        />
                        <div>
                          <p className="text-sm font-medium">{addon.name}</p>
                          <p className="text-xs text-muted-foreground">
                            +{formatPrice(addon.unitPrice)}
                          </p>
                        </div>
                      </div>
                      {addon.selected ? (
                        <div className="flex items-center gap-1">
                          <Button
                            aria-label={`Diminuir ${addon.name}`}
                            onClick={() => adjustAddonQuantity(addon.productAddonId, -1)}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-semibold">
                            {addon.quantity}
                          </span>
                          <Button
                            aria-label={`Aumentar ${addon.name}`}
                            onClick={() => adjustAddonQuantity(addon.productAddonId, 1)}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {quantity > 1 && addons.some((addon) => addon.selected) ? (
                  <output className="block rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                    Os adicionais valem para cada uma das {quantity} unidades. Se só algumas levam
                    adicional, lance essas unidades como um item separado.
                  </output>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="item-notes">Observação</Label>
              <Textarea
                id="item-notes"
                maxLength={280}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ex.: sem cebola, café sem açúcar..."
                rows={2}
                value={notes}
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Subtotal</span>
            <span className="text-base font-semibold tabular-nums text-primary">
              {formatPrice(itemTotal)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              className="hidden sm:inline-flex"
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              Cancelar
            </Button>
            <Button
              className="h-11 px-5 sm:h-10"
              disabled={detailQuery.isLoading || !product}
              onClick={handleConfirm}
              type="button"
            >
              {initialDraft ? 'Atualizar item' : 'Adicionar ao pedido'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
