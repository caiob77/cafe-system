'use client';

import { Loader2, MenuSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { OrdersKanbanCard } from '@/components/pedidos/orders-kanban-card';
import { ApiError } from '@/lib/api-client';

import { useOrders, useUpdateOrderStatus } from '@/features/pedidos/api/use-orders';
import type { Order, OrderStatus } from '@/features/pedidos/types';
import { orderStatusLabel } from '@/features/pedidos/utils/status';

const KANBAN_COLUMNS: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivered'];

export function OrdersKanbanContainer() {
  const router = useRouter();
  const ordersQuery = useOrders({ active: true });
  const updateStatus = useUpdateOrderStatus();
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orders = ordersQuery.data ?? [];

  function handleOpen(order: Order) {
    if (order.type === 'dine_in' && order.tableId) {
      router.push(`/mesas/${order.tableId}`);
      return;
    }
    router.push('/pedidos');
  }

  async function handleAdvance(order: Order, next: OrderStatus) {
    setError(null);
    setPendingOrderId(order.id);
    try {
      await updateStatus.mutateAsync({
        id: order.id,
        status: next,
        version: order.version,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível atualizar o pedido.');
    } finally {
      setPendingOrderId(null);
    }
  }

  if (ordersQuery.isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 py-12 text-center">
        <MenuSquare className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nenhum pedido em andamento. Abra um pedido pelas mesas para acompanhar aqui.
        </p>
      </div>
    );
  }

  const grouped = new Map<OrderStatus, Order[]>();
  for (const column of KANBAN_COLUMNS) grouped.set(column, []);
  for (const order of orders) {
    const bucket = grouped.get(order.status);
    if (bucket) bucket.push(order);
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {KANBAN_COLUMNS.map((column) => {
          const columnOrders = grouped.get(column) ?? [];
          return (
            <section
              className="flex min-h-[200px] flex-col gap-2 rounded-lg border bg-muted/20 p-3"
              key={column}
            >
              <header className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{orderStatusLabel[column]}</h2>
                <span className="text-xs text-muted-foreground">{columnOrders.length}</span>
              </header>
              <div className="flex flex-1 flex-col gap-2">
                {columnOrders.length === 0 ? (
                  <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                    Nenhum pedido.
                  </p>
                ) : (
                  columnOrders.map((order) => (
                    <OrdersKanbanCard
                      key={order.id}
                      onAdvance={handleAdvance}
                      onOpen={handleOpen}
                      order={order}
                      pendingAdvance={pendingOrderId === order.id}
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
