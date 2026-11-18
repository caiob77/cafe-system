'use client';

import { ChefHat, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { KitchenTicketCard } from '@/components/cozinha/kitchen-ticket-card';
import { BoardColumnTabs, firstNonEmptyColumn } from '@/components/pedidos/board-column-tabs';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

import { useUpdateOrderStatus } from '@/features/pedidos/api/use-orders';
import type { Order, OrderStatus } from '@/features/pedidos/types';
import { orderStatusLabel } from '@/features/pedidos/utils/status';

import { useKitchenOrders } from '../api/use-kitchen-orders';

const COLUMNS: { status: OrderStatus; tone: string }[] = [
  { status: 'pending', tone: 'border-slate-300/60' },
  { status: 'preparing', tone: 'border-amber-400/60' },
  { status: 'ready', tone: 'border-sky-400/60' },
];

export function KitchenBoardContainer() {
  const ordersQuery = useKitchenOrders();
  const updateStatus = useUpdateOrderStatus();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobileColumn, setMobileColumn] = useState<OrderStatus | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<OrderStatus, Order[]>();
    for (const column of COLUMNS) map.set(column.status, []);
    for (const order of ordersQuery.data ?? []) {
      const bucket = map.get(order.status);
      if (bucket) bucket.push(order);
    }
    return map;
  }, [ordersQuery.data]);

  async function handleAdvance(order: Order, next: OrderStatus) {
    setError(null);
    setPendingId(order.id);
    try {
      await updateStatus.mutateAsync({ id: order.id, status: next, version: order.version });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível avançar o pedido.');
    } finally {
      setPendingId(null);
    }
  }

  if (ordersQuery.isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const totalActive = (ordersQuery.data ?? []).length;
  const columnKeys = COLUMNS.map((column) => column.status);
  const activeColumn = mobileColumn ?? firstNonEmptyColumn(columnKeys, grouped);

  if (totalActive === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 py-12 text-center">
        <ChefHat className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Sem pedidos na cozinha. Esta tela atualiza automaticamente a cada poucos segundos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert variant="destructive">{error}</Alert> : null}

      <BoardColumnTabs
        columns={COLUMNS.map((column) => ({
          value: column.status,
          label: orderStatusLabel[column.status],
          count: grouped.get(column.status)?.length ?? 0,
        }))}
        onChange={setMobileColumn}
        value={activeColumn}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {COLUMNS.map((column) => {
          const orders = grouped.get(column.status) ?? [];
          return (
            <section
              className={cn(
                'flex-col gap-2 md:flex md:min-h-[200px] md:rounded-lg md:border-2 md:bg-muted/20 md:p-3',
                column.tone,
                column.status === activeColumn ? 'flex' : 'hidden',
              )}
              key={column.status}
            >
              <header className="hidden items-center justify-between md:flex">
                <h2 className="text-sm font-semibold">{orderStatusLabel[column.status]}</h2>
                <span className="rounded-full bg-card px-2 text-xs text-muted-foreground">
                  {orders.length}
                </span>
              </header>
              <div className="flex flex-1 flex-col gap-2">
                {orders.length === 0 ? (
                  <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground md:py-6 md:text-xs">
                    Nenhum pedido nesta etapa.
                  </p>
                ) : (
                  orders.map((order) => (
                    <KitchenTicketCard
                      key={order.id}
                      onAdvance={handleAdvance}
                      order={order}
                      pendingAdvance={pendingId === order.id}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
