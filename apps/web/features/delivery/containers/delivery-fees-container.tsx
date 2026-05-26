'use client';

import { Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { DeliveryFeeFormDialog } from '@/components/delivery/delivery-fee-form-dialog';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';

import { formatPrice } from '@/features/cardapio/utils/format-price';

import { useDeleteDeliveryFee, useDeliveryFees } from '../api/use-delivery-fees';
import type { DeliveryFee } from '../types';

export function DeliveryFeesContainer() {
  const feesQuery = useDeliveryFees();
  const deleteFee = useDeleteDeliveryFee();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryFee | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(fee: DeliveryFee) {
    if (!window.confirm(`Remover a taxa de “${fee.neighborhood}”?`)) return;
    setError(null);
    try {
      await deleteFee.mutateAsync(fee.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível remover a taxa.');
    }
  }

  const fees = feesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Taxas por bairro</h2>
          <p className="text-xs text-muted-foreground">
            A taxa configurada aqui sobrepõe a taxa padrão da organização para o bairro do cliente.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Nova taxa
        </Button>
      </div>

      {error ? <Alert variant="destructive">{error}</Alert> : null}

      {feesQuery.isLoading ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : fees.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 py-10 text-center">
          <MapPin className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma taxa cadastrada.</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border bg-card">
          {fees.map((fee) => (
            <li className="flex items-center justify-between gap-2 px-3 py-2.5" key={fee.id}>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{fee.neighborhood}</span>
                <span className="text-xs text-muted-foreground">Taxa fixa por entrega</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{formatPrice(fee.fee)}</span>
                <Button
                  onClick={() => {
                    setEditing(fee);
                    setFormOpen(true);
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  disabled={deleteFee.isPending}
                  onClick={() => handleDelete(fee)}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <DeliveryFeeFormDialog fee={editing} onOpenChange={setFormOpen} open={formOpen} />
    </div>
  );
}
