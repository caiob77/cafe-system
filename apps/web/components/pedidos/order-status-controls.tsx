'use client';

import { ArrowRight, Loader2, XOctagon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { Order, OrderStatus } from '@/features/pedidos/types';
import {
  getAllowedTransitions,
  orderStatusBadgeStyle,
  orderStatusLabel,
} from '@/features/pedidos/utils/status';

type OrderStatusControlsProps = {
  order: Order;
  pending: boolean;
  onAdvance: (next: OrderStatus) => void;
  onCancel: () => void;
};

export function OrderStatusControls({
  order,
  pending,
  onAdvance,
  onCancel,
}: OrderStatusControlsProps) {
  const transitions = getAllowedTransitions(order.status, order.type);
  const advancing = transitions.filter((next) => next !== 'cancelled');
  const canCancel = transitions.includes('cancelled');

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Status</span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
            orderStatusBadgeStyle[order.status],
          )}
        >
          {orderStatusLabel[order.status]}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {advancing.length === 0 ? (
          <p className="text-xs text-muted-foreground">Pedido fechado para mais alterações.</p>
        ) : (
          advancing.map((next) => (
            <Button
              disabled={pending}
              key={next}
              onClick={() => onAdvance(next)}
              size="sm"
              type="button"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {orderStatusLabel[next]}
            </Button>
          ))
        )}
        {canCancel ? (
          <Button
            disabled={pending}
            onClick={onCancel}
            size="sm"
            type="button"
            variant="destructive"
          >
            <XOctagon className="h-4 w-4" />
            Cancelar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
