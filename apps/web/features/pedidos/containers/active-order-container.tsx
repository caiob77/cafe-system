'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { OrderStatusControls } from '@/components/pedidos/order-status-controls';
import { OrderSummary } from '@/components/pedidos/order-summary';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';

import { useOrder, useUpdateOrderStatus } from '@/features/pedidos/api/use-orders';
import type { OrderStatus } from '@/features/pedidos/types';

type ActiveOrderContainerProps = {
  orderId: string;
};

export function ActiveOrderContainer({ orderId }: ActiveOrderContainerProps) {
  const orderQuery = useOrder(orderId);
  const updateStatus = useUpdateOrderStatus();
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleAdvance(next: OrderStatus) {
    if (!orderQuery.data) return;
    setActionError(null);
    try {
      await updateStatus.mutateAsync({
        id: orderId,
        status: next,
        version: orderQuery.data.version,
      });
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : 'Não foi possível atualizar o status.',
      );
    }
  }

  async function handleCancel() {
    if (!orderQuery.data) return;
    const reason = window.prompt('Motivo do cancelamento:');
    if (!reason || reason.trim().length < 2) return;
    setActionError(null);
    try {
      await updateStatus.mutateAsync({
        id: orderId,
        status: 'cancelled',
        version: orderQuery.data.version,
        cancelReason: reason.trim(),
      });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível cancelar o pedido.');
    }
  }

  if (orderQuery.isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const order = orderQuery.data;
  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 py-12 text-center">
        <p className="text-sm text-muted-foreground">Pedido não encontrado.</p>
        <Button asChild type="button" variant="ghost">
          <Link href="/mesas">
            <ArrowLeft className="h-4 w-4" />
            Voltar para mesas
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex-1 space-y-4">
        <OrderSummary order={order} />
        {actionError ? (
          <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {actionError}
          </p>
        ) : null}
      </div>
      <div className="w-full shrink-0 lg:max-w-sm">
        <OrderStatusControls
          onAdvance={handleAdvance}
          onCancel={handleCancel}
          order={order}
          pending={updateStatus.isPending}
        />
      </div>
    </div>
  );
}
