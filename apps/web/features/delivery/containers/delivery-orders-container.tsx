'use client';

import { Clock, Loader2, MapPin, Phone, Truck } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

import { formatPrice } from '@/features/cardapio/utils/format-price';
import { useOrders, useUpdateOrderStatus } from '@/features/pedidos/api/use-orders';
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

export function DeliveryOrdersContainer() {
  const ordersQuery = useOrders({ active: true });
  const updateStatus = useUpdateOrderStatus();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orders = (ordersQuery.data ?? []).filter((order) => order.type === 'delivery');

  async function handleAdvance(order: Order, next: OrderStatus) {
    setError(null);
    setPendingId(order.id);
    try {
      await updateStatus.mutateAsync({ id: order.id, status: next, version: order.version });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível atualizar o pedido.');
    } finally {
      setPendingId(null);
    }
  }

  if (ordersQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 py-10 text-center">
        <Truck className="h-7 w-7 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Sem pedidos delivery em andamento.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((order) => {
          const transitions = getAllowedTransitions(order.status, order.type).filter(
            (next) => next !== 'cancelled',
          );
          const nextStep = transitions[0] ?? null;
          return (
            <article
              className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm"
              key={order.id}
            >
              <header className="flex items-center justify-between">
                <span className="text-base font-semibold">#{order.dailyNumber}</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    orderStatusBadgeStyle[order.status],
                  )}
                >
                  {orderStatusLabel[order.status]}
                </span>
              </header>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 text-sm text-foreground">
                  <Truck className="h-3.5 w-3.5" />
                  {order.customer?.name ?? 'Cliente'}
                </span>
                {order.customer?.phone ? (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {order.customer.phone}
                  </span>
                ) : null}
                {order.deliveryAddress ? (
                  <span className="flex items-start gap-1">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    {order.deliveryAddress}
                  </span>
                ) : null}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeFormatter.format(new Date(order.createdAt))}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-2 text-sm">
                <span className="text-muted-foreground">
                  {order.items.length} item{order.items.length === 1 ? '' : 's'}
                </span>
                <span className="font-semibold">{formatPrice(order.total)}</span>
              </div>
              {order.deliveryFee && Number(order.deliveryFee) > 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  Inclui taxa de entrega {formatPrice(order.deliveryFee)}
                </p>
              ) : null}
              {nextStep ? (
                <Button
                  disabled={pendingId === order.id}
                  onClick={() => handleAdvance(order, nextStep)}
                  size="touch"
                >
                  {pendingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Avançar para {orderStatusLabel[nextStep]}
                </Button>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
