'use client';

import { ArrowRight, ChefHat, Clock, Loader2, NotebookPen, Truck, Utensils } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

const NEXT_KITCHEN_STEP: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'preparing',
  preparing: 'ready',
};

type KitchenTicketCardProps = {
  order: Order;
  pendingAdvance: boolean;
  onAdvance: (order: Order, next: OrderStatus) => void;
};

export function KitchenTicketCard({ order, pendingAdvance, onAdvance }: KitchenTicketCardProps) {
  const nextStep = NEXT_KITCHEN_STEP[order.status];
  const allowed = nextStep
    ? getAllowedTransitions(order.status, order.type).includes(nextStep)
    : false;
  const isDelivery = order.type === 'delivery';

  return (
    <article className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-base font-semibold">#{order.dailyNumber}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {isDelivery ? <Truck className="h-3.5 w-3.5" /> : <Utensils className="h-3.5 w-3.5" />}
            {isDelivery
              ? (order.customer?.name ?? 'Cliente delivery')
              : order.table
                ? `Mesa #${order.table.number}`
                : 'Sem mesa'}
          </span>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            orderStatusBadgeStyle[order.status],
          )}
        >
          {orderStatusLabel[order.status]}
        </span>
      </header>

      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        Aberto às {timeFormatter.format(new Date(order.createdAt))}
      </p>

      <ul className="flex flex-col gap-1.5 text-sm">
        {order.items.map((item) => (
          <li className="flex flex-col" key={item.id}>
            <span className="font-medium">
              {item.quantity}× {item.productNameSnapshot}
            </span>
            {item.addons.length > 0 ? (
              <span className="pl-3 text-xs text-muted-foreground">
                {item.addons.map((addon) => `+ ${addon.addonNameSnapshot}`).join(', ')}
              </span>
            ) : null}
            {item.notes ? (
              <span className="pl-3 text-xs italic text-muted-foreground">“{item.notes}”</span>
            ) : null}
          </li>
        ))}
      </ul>

      {order.kitchenNotes ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <NotebookPen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{order.kitchenNotes}</span>
        </div>
      ) : null}

      {nextStep && allowed ? (
        <Button
          className="self-end"
          disabled={pendingAdvance}
          onClick={() => onAdvance(order, nextStep)}
          size="sm"
          type="button"
        >
          {pendingAdvance ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : nextStep === 'ready' ? (
            <ChefHat className="h-4 w-4" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          {orderStatusLabel[nextStep]}
        </Button>
      ) : null}
    </article>
  );
}
