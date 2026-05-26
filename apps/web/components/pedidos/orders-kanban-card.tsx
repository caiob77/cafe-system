'use client';

import { ArrowRight, Clock, Loader2, Truck, Utensils } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { formatPrice } from '@/features/cardapio/utils/format-price';
import type { Order, OrderStatus } from '@/features/pedidos/types';
import {
  getAllowedTransitions,
  orderStatusBadgeStyle,
  orderStatusLabel,
} from '@/features/pedidos/utils/status';

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

function summarizeItems(order: Order): string {
  const max = 3;
  const head = order.items
    .slice(0, max)
    .map((item) => `${item.quantity}× ${item.productNameSnapshot}`)
    .join(', ');
  const remaining = order.items.length - max;
  return remaining > 0 ? `${head} +${remaining}` : head;
}

type OrdersKanbanCardProps = {
  order: Order;
  pendingAdvance: boolean;
  onOpen: (order: Order) => void;
  onAdvance: (order: Order, next: OrderStatus) => void;
};

export function OrdersKanbanCard({
  order,
  pendingAdvance,
  onOpen,
  onAdvance,
}: OrdersKanbanCardProps) {
  const transitions = getAllowedTransitions(order.status, order.type).filter(
    (next) => next !== 'cancelled',
  );
  const nextStep = transitions[0] ?? null;
  const isDelivery = order.type === 'delivery';

  return (
    <article className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm">
      <button
        className="flex flex-col gap-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onOpen(order)}
        type="button"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">#{order.dailyNumber}</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              orderStatusBadgeStyle[order.status],
            )}
          >
            {orderStatusLabel[order.status]}
          </span>
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {isDelivery ? <Truck className="h-3.5 w-3.5" /> : <Utensils className="h-3.5 w-3.5" />}
          {isDelivery
            ? (order.customer?.name ?? 'Cliente')
            : order.table
              ? `Mesa #${order.table.number}`
              : 'Sem mesa'}
        </p>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {timeFormatter.format(new Date(order.createdAt))}
        </p>
        <p className="line-clamp-2 text-xs">{summarizeItems(order)}</p>
        <span className="mt-1 text-xs font-semibold text-primary">{formatPrice(order.total)}</span>
      </button>

      {nextStep ? (
        <Button
          disabled={pendingAdvance}
          onClick={() => onAdvance(order, nextStep)}
          size="sm"
          type="button"
        >
          {pendingAdvance ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          {orderStatusLabel[nextStep]}
        </Button>
      ) : null}
    </article>
  );
}
