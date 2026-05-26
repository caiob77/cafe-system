'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

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
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-client';

import { priceInputToApi } from '@/features/cardapio/utils/format-price';

import { useCreateCashMovement } from '@/features/caixa/api/use-cash-register';
import type { CashMovementType } from '@/features/caixa/types';

type MovementDialogProps = {
  registerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MovementDialog({ registerId, open, onOpenChange }: MovementDialogProps) {
  const createMovement = useCreateCashMovement(registerId);
  const [type, setType] = useState<CashMovementType>('withdrawal');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setType('withdrawal');
    setAmount('');
    setReason('');
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createMovement.mutateAsync({
        type,
        amount: priceInputToApi(amount || '0'),
        reason: reason.trim(),
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível registrar o movimento.');
    }
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      open={open}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo movimento</DialogTitle>
          <DialogDescription>
            Registre uma sangria (retirada) ou um suprimento (depósito) no caixa.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="movement-type">Tipo</Label>
            <Select
              id="movement-type"
              onChange={(event) => setType(event.target.value as CashMovementType)}
              value={type}
            >
              <option value="withdrawal">Sangria (retirada)</option>
              <option value="deposit">Suprimento (depósito)</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="movement-amount">Valor (R$)</Label>
            <Input
              id="movement-amount"
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0,00"
              required
              value={amount}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="movement-reason">Motivo</Label>
            <Textarea
              id="movement-reason"
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex.: troco para fornecedor"
              required
              rows={2}
              value={reason}
            />
          </div>
          {error ? <Alert variant="destructive">{error}</Alert> : null}
          <DialogFooter>
            <Button
              disabled={createMovement.isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              Cancelar
            </Button>
            <Button disabled={createMovement.isPending} type="submit">
              {createMovement.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
