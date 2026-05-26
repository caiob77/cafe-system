'use client';

import { Clock, Hash } from 'lucide-react';

import { formatPrice } from '@/features/cardapio/utils/format-price';
import type { Order } from '@/features/pedidos/types';

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
});

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

type OrderSummaryProps = {
  order: Order;
};

export function OrderSummary({ order }: OrderSummaryProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Hash className="h-4 w-4" />
            Pedido #{order.dailyNumber}
          </h2>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Aberto às {formatDateTime(order.createdAt)}
            {order.table ? ` · Mesa #${order.table.number}` : ''}
          </p>
        </div>
        <span className="text-sm font-semibold text-primary">Total {formatPrice(order.total)}</span>
      </header>

      <ul className="divide-y rounded-md border">
        {order.items.map((item) => (
          <li className="flex flex-col gap-1 p-3" key={item.id}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">
                {item.quantity}× {item.productNameSnapshot}
              </p>
              <span className="shrink-0 text-sm text-muted-foreground">
                {formatPrice(Number(item.unitPrice) * item.quantity)}
              </span>
            </div>
            {item.addons.length > 0 ? (
              <ul className="ml-3 list-disc text-xs text-muted-foreground">
                {item.addons.map((addon) => (
                  <li key={addon.id}>
                    {addon.quantity}× {addon.addonNameSnapshot} (+
                    {formatPrice(Number(addon.unitPrice) * addon.quantity)})
                  </li>
                ))}
              </ul>
            ) : null}
            {item.notes ? (
              <p className="text-xs italic text-muted-foreground">{item.notes}</p>
            ) : null}
          </li>
        ))}
      </ul>

      {order.notes ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <p className="font-medium">Observação do pedido</p>
          <p className="text-muted-foreground">{order.notes}</p>
        </div>
      ) : null}

      {order.cancelReason ? (
        <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <p className="font-medium">Motivo do cancelamento</p>
          <p>{order.cancelReason}</p>
        </div>
      ) : null}
    </div>
  );
}
