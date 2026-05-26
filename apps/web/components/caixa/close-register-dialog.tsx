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
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-client';

import { formatPrice, priceInputToApi } from '@/features/cardapio/utils/format-price';

import { useCloseCashRegister } from '@/features/caixa/api/use-cash-register';
import type { CashRegister } from '@/features/caixa/types';

type CloseRegisterDialogProps = {
  register: CashRegister;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CloseRegisterDialog({ register, open, onOpenChange }: CloseRegisterDialogProps) {
  const closeRegister = useCloseCashRegister();
  const [finalAmount, setFinalAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFinalAmount('');
    setNotes('');
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await closeRegister.mutateAsync({
        finalAmount: finalAmount ? priceInputToApi(finalAmount) : undefined,
        notes: notes.trim() || undefined,
        version: register.version,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível fechar o caixa.');
    }
  }

  const expected = register.summary?.cashFlow.expected ?? register.initialAmount;

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
          <DialogTitle>Fechar caixa</DialogTitle>
          <DialogDescription>
            Confira o valor em caixa físico e informe abaixo. Se ficar em branco, o sistema usará o
            valor esperado.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="text-muted-foreground">Valor esperado em caixa</p>
            <p className="text-lg font-semibold">{formatPrice(expected)}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="final-amount">Valor contado (R$)</Label>
            <Input
              id="final-amount"
              inputMode="decimal"
              onChange={(event) => setFinalAmount(event.target.value)}
              placeholder="0,00"
              value={finalAmount}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="close-notes">Observação (opcional)</Label>
            <Textarea
              id="close-notes"
              maxLength={500}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex.: diferença justificada"
              rows={2}
              value={notes}
            />
          </div>
          {error ? <Alert variant="destructive">{error}</Alert> : null}
          <DialogFooter>
            <Button
              disabled={closeRegister.isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="ghost"
            >
              Cancelar
            </Button>
            <Button disabled={closeRegister.isPending} type="submit" variant="destructive">
              {closeRegister.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Fechar caixa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
