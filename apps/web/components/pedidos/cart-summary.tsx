'use client';

import { Pencil, ShoppingCart, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { formatPrice } from '@/features/cardapio/utils/format-price';
import type { DraftOrderItem } from '@/features/pedidos/types';
import { calculateDraftItemTotal, calculateDraftSubtotal } from '@/features/pedidos/utils/draft';

type CartSummaryProps = {
  items: DraftOrderItem[];
  notes: string;
  submitting: boolean;
  onChangeNotes: (notes: string) => void;
  onEdit: (item: DraftOrderItem) => void;
  onRemove: (tempId: string) => void;
  onConfirm: () => void;
};

export function CartSummary({
  items,
  notes,
  submitting,
  onChangeNotes,
  onEdit,
  onRemove,
  onConfirm,
}: CartSummaryProps) {
  const subtotal = calculateDraftSubtotal(items);
  const empty = items.length === 0;

  return (
    <aside className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ShoppingCart className="h-4 w-4" />
          Carrinho
        </h2>
        <span className="text-xs text-muted-foreground">{items.length} itens</span>
      </div>

      {empty ? (
        <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
          Toque num produto do cardápio para começar.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const total = calculateDraftItemTotal(item);
            return (
              <li className="rounded-md border bg-background p-3" key={item.tempId}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {item.quantity}× {item.productName}
                    </p>
                    {item.addons.length > 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.addons.map((addon) => `${addon.quantity}× ${addon.name}`).join(', ')}
                      </p>
                    ) : null}
                    {item.notes ? (
                      <p className="mt-1 text-xs italic text-muted-foreground">{item.notes}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-primary">
                    {formatPrice(total)}
                  </span>
                </div>
                <div className="mt-2 flex justify-end gap-1">
                  <Button
                    aria-label={`Editar ${item.productName}`}
                    onClick={() => onEdit(item)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    aria-label={`Remover ${item.productName}`}
                    onClick={() => onRemove(item.tempId)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="order-notes">
          Observação do pedido
        </label>
        <Textarea
          id="order-notes"
          maxLength={500}
          onChange={(event) => onChangeNotes(event.target.value)}
          placeholder="Mensagem opcional para o pedido inteiro"
          rows={2}
          value={notes}
        />
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-sm text-muted-foreground">Subtotal</span>
        <span className="text-lg font-semibold text-primary">{formatPrice(subtotal)}</span>
      </div>

      <Button disabled={empty || submitting} onClick={onConfirm} size="default" type="button">
        {submitting ? 'Enviando...' : 'Confirmar pedido'}
      </Button>
    </aside>
  );
}
