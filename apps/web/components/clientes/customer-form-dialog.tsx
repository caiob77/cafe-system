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
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-client';

import { useCreateCustomer, useUpdateCustomer } from '@/features/clientes/api/use-customers';
import type { Customer } from '@/features/clientes/types';

type CustomerFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
};

const emptyState = {
  name: '',
  phone: '',
  address: '',
  neighborhood: '',
  reference: '',
  notes: '',
};

export function CustomerFormDialog({ open, onOpenChange, customer }: CustomerFormDialogProps) {
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const [form, setForm] = useState(emptyState);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(customer);
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      setError(null);
      setForm(
        customer
          ? {
              name: customer.name,
              phone: customer.phone,
              address: customer.address ?? '',
              neighborhood: customer.neighborhood ?? '',
              reference: customer.reference ?? '',
              notes: customer.notes ?? '',
            }
          : emptyState,
      );
    }
  }, [open, customer]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim() || null,
      neighborhood: form.neighborhood.trim() || null,
      reference: form.reference.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      if (customer) {
        await update.mutateAsync({ id: customer.id, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar o cliente.');
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
          <DialogDescription>
            Dados de contato e endereço para pedidos de entrega.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-name">Nome</Label>
            <Input
              id="customer-name"
              maxLength={120}
              onChange={(event) => setForm((s) => ({ ...s, name: event.target.value }))}
              required
              value={form.name}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-phone">Telefone</Label>
            <Input
              id="customer-phone"
              inputMode="tel"
              onChange={(event) => setForm((s) => ({ ...s, phone: event.target.value }))}
              placeholder="(11) 99999-9999"
              required
              value={form.phone}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-address">Endereço</Label>
            <Input
              id="customer-address"
              maxLength={280}
              onChange={(event) => setForm((s) => ({ ...s, address: event.target.value }))}
              value={form.address}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-neighborhood">Bairro</Label>
            <Input
              id="customer-neighborhood"
              maxLength={120}
              onChange={(event) => setForm((s) => ({ ...s, neighborhood: event.target.value }))}
              value={form.neighborhood}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-reference">Ponto de referência</Label>
            <Input
              id="customer-reference"
              maxLength={280}
              onChange={(event) => setForm((s) => ({ ...s, reference: event.target.value }))}
              value={form.reference}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-notes">Observações</Label>
            <Textarea
              id="customer-notes"
              maxLength={500}
              onChange={(event) => setForm((s) => ({ ...s, notes: event.target.value }))}
              rows={2}
              value={form.notes}
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
