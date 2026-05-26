'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-client';

import { priceInputToApi } from '@/features/cardapio/utils/format-price';

import { useOpenCashRegister } from '@/features/caixa/api/use-cash-register';

export function OpenRegisterForm() {
  const openRegister = useOpenCashRegister();
  const [initialAmount, setInitialAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await openRegister.mutateAsync({
        initialAmount: priceInputToApi(initialAmount || '0'),
        notes: notes.trim() || undefined,
      });
      setInitialAmount('');
      setNotes('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível abrir o caixa.');
    }
  }

  return (
    <form className="flex max-w-md flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="initial-amount">Valor inicial em caixa (R$)</Label>
        <Input
          id="initial-amount"
          inputMode="decimal"
          onChange={(event) => setInitialAmount(event.target.value)}
          placeholder="0,00"
          required
          value={initialAmount}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="open-notes">Observação (opcional)</Label>
        <Textarea
          id="open-notes"
          maxLength={500}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Ex.: troco inicial conferido"
          rows={2}
          value={notes}
        />
      </div>
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      <Button disabled={openRegister.isPending} type="submit">
        {openRegister.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Abrir caixa
      </Button>
    </form>
  );
}
