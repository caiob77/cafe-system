'use client';

import { Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-client';

import { priceInputToApi } from '@/features/cardapio/utils/format-price';

import { useCreateDeliveryFee, useUpdateDeliveryFee } from '@/features/delivery/api/use-delivery-fees';
import type { DeliveryFee } from '@/features/delivery/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fee?: DeliveryFee | null;
};

export function DeliveryFeeFormDialog({ open, onOpenChange, fee }: Props) {
  const create = useCreateDeliveryFee();
  const update = useUpdateDeliveryFee();
  const [neighborhood, setNeighborhood] = useState('');
  const [feeValue, setFeeValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;
  const isEdit = Boolean(fee);

  useEffect(() => {
    if (open) {
      setError(null);
      setNeighborhood(fee?.neighborhood ?? '');
      setFeeValue(fee?.fee ?? '');
    }
  }, [open, fee]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const payload = {
        neighborhood: neighborhood.trim(),
        fee: priceInputToApi(feeValue || '0'),
      };
      if (fee) {
        await update.mutateAsync({ id: fee.id, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar a taxa.');
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar taxa' : 'Nova taxa por bairro'}</DialogTitle>
          <DialogDescription>
            Valor cobrado por entrega no bairro informado.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fee-neighborhood">Bairro</Label>
            <Input
              id="fee-neighborhood"
              maxLength={120}
              onChange={(event) => setNeighborhood(event.target.value)}
              required
              value={neighborhood}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fee-value">Valor (R$)</Label>
            <Input
              id="fee-value"
              inputMode="decimal"
              onChange={(event) => setFeeValue(event.target.value)}
              placeholder="0,00"
              required
              value={feeValue}
            />
          </div>
          {error ? <Alert variant="destructive">{error}</Alert> : null}
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              Cancelar
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
