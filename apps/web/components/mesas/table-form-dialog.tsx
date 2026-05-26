'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

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

import type { Table, TableInput } from '@/features/mesas/types';

type TableFormDialogProps = {
  open: boolean;
  table: Table | null;
  loading: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: TableInput) => Promise<void> | void;
};

export function TableFormDialog({
  open,
  table,
  loading,
  error,
  onOpenChange,
  onSubmit,
}: TableFormDialogProps) {
  const [number, setNumber] = useState('');
  const [capacity, setCapacity] = useState('');
  const isEditing = table !== null;

  useEffect(() => {
    if (open) {
      setNumber(table ? String(table.number) : '');
      setCapacity(table ? String(table.capacity) : '4');
    }
  }, [open, table]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const parsedNumber = Number(number);
    const parsedCapacity = Number(capacity);
    if (!Number.isInteger(parsedNumber) || parsedNumber < 1) return;
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) return;
    await onSubmit({ number: parsedNumber, capacity: parsedCapacity });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar mesa' : 'Nova mesa'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize número ou capacidade da mesa.'
              : 'Cadastre uma mesa do salão (número único por café).'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="table-number">Número</Label>
              <Input
                autoFocus
                id="table-number"
                inputMode="numeric"
                max={9999}
                min={1}
                onChange={(event) => setNumber(event.target.value)}
                placeholder="1"
                required
                type="number"
                value={number}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="table-capacity">Lugares</Label>
              <Input
                id="table-capacity"
                inputMode="numeric"
                max={99}
                min={1}
                onChange={(event) => setCapacity(event.target.value)}
                placeholder="4"
                required
                type="number"
                value={capacity}
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} type="button" variant="ghost">
              Cancelar
            </Button>
            <Button disabled={loading || number.length === 0} type="submit">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEditing ? 'Salvar alterações' : 'Criar mesa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
