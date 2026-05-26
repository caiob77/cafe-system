'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { useTables } from '@/features/mesas/api/use-tables';
import { ActiveOrderContainer } from '@/features/pedidos/containers/active-order-container';
import { NewOrderContainer } from '@/features/pedidos/containers/new-order-container';

type MesaDetailContainerProps = {
  tableId: string;
};

export function MesaDetailContainer({ tableId }: MesaDetailContainerProps) {
  const tablesQuery = useTables({ refetchIntervalMs: 5_000 });

  if (tablesQuery.isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const table = (tablesQuery.data ?? []).find((entry) => entry.id === tableId);

  if (!table) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 py-12 text-center">
        <p className="text-sm text-muted-foreground">Mesa não encontrada.</p>
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
    <div className="space-y-4">
      <Button asChild size="sm" type="button" variant="ghost">
        <Link href="/mesas">
          <ArrowLeft className="h-4 w-4" />
          Voltar para mesas
        </Link>
      </Button>

      {table.activeOrderId ? (
        <ActiveOrderContainer orderId={table.activeOrderId} />
      ) : (
        <NewOrderContainer tableId={table.id} tableNumber={table.number} />
      )}
    </div>
  );
}
