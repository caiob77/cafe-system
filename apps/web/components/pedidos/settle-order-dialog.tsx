'use client';

import { Coins, CreditCard, Loader2, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

import { formatPrice } from '@/features/cardapio/utils/format-price';
import { type SettlementMethod, useSettleOrder } from '@/features/pedidos/api/use-settle-order';
import type { Order } from '@/features/pedidos/types';

const methods: Array<{
  value: SettlementMethod;
  label: string;
  icon: typeof Coins;
}> = [
  { value: 'cash', label: 'Dinheiro', icon: Coins },
  { value: 'pix', label: 'Pix', icon: Smartphone },
  { value: 'credit_card', label: 'Crédito', icon: CreditCard },
  { value: 'debit_card', label: 'Débito', icon: CreditCard },
];

type SettleOrderDialogProps = {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettleOrderDialog({ order, open, onOpenChange }: SettleOrderDialogProps) {
  const settleOrder = useSettleOrder();
  const [method, setMethod] = useState<SettlementMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const payable = order !== null && Number(order.total) > 0;

  useEffect(() => {
    if (open) return;
    setMethod(null);
    setError(null);
  }, [open]);

  function reset() {
    setMethod(null);
    setError(null);
  }

  async function handleConfirm() {
    if (!order) return;
    if (payable && !method) {
      setError('Selecione o método de pagamento.');
      return;
    }
    setError(null);
    try {
      await settleOrder.mutateAsync({ order, method });
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível finalizar o pedido.');
    }
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        if (settleOrder.isPending) return;
        if (!next) reset();
        onOpenChange(next);
      }}
      open={open}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finalizar pedido{order ? ` #${order.dailyNumber}` : ''}</DialogTitle>
          <DialogDescription>
            {payable
              ? 'Escolha como este pedido foi pago. O valor entra no relatório e no caixa.'
              : 'Este pedido não tem valor a receber.'}
          </DialogDescription>
        </DialogHeader>
        {order ? <p className="text-2xl font-semibold">{formatPrice(order.total)}</p> : null}
        {payable ? (
          <fieldset className="m-0 grid min-w-0 grid-cols-2 gap-2 border-0 p-0">
            <legend className="sr-only">Método de pagamento</legend>
            {methods.map((item) => {
              const Icon = item.icon;
              const selected = method === item.value;
              return (
                <Button
                  aria-pressed={selected}
                  className={cn(
                    'border',
                    selected && 'border-primary bg-primary/10 text-foreground',
                  )}
                  disabled={settleOrder.isPending}
                  key={item.value}
                  onClick={() => setMethod(item.value)}
                  type="button"
                  variant="secondary"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </fieldset>
        ) : null}
        {error ? <Alert variant="destructive">{error}</Alert> : null}
        <DialogFooter>
          <Button
            disabled={settleOrder.isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="ghost"
          >
            Cancelar
          </Button>
          <Button
            disabled={settleOrder.isPending || (payable && method === null)}
            onClick={handleConfirm}
            type="button"
          >
            {settleOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Finalizar pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
