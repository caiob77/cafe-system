'use client';

import { Loader2, MapPin, Pencil, Phone, Plus, Search, Trash2, Users } from 'lucide-react';
import { useState } from 'react';

import { CustomerFormDialog } from '@/components/clientes/customer-form-dialog';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api-client';

import { useCustomers, useDeleteCustomer } from '../api/use-customers';
import type { Customer } from '../types';

export function CustomersListContainer() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const customersQuery = useCustomers({ search: debounced });
  const deleteCustomer = useDeleteCustomer();

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setDebounced(search);
  }

  async function handleDelete(customer: Customer) {
    if (!window.confirm(`Remover o cliente “${customer.name}”?`)) return;
    setError(null);
    try {
      await deleteCustomer.mutateAsync(customer.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível remover o cliente.');
    }
  }

  const customers = customersQuery.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <form className="flex w-full max-w-sm items-end gap-2" onSubmit={handleSearch}>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs text-muted-foreground" htmlFor="customer-search">
              Buscar
            </label>
            <Input
              id="customer-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome ou telefone"
              value={search}
            />
          </div>
          <Button size="sm" type="submit" variant="secondary">
            <Search className="h-4 w-4" />
            Buscar
          </Button>
        </form>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Novo cliente
        </Button>
      </div>

      {error ? <Alert variant="destructive">{error}</Alert> : null}

      {customersQuery.isLoading ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 py-10 text-center">
          <Users className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border bg-card">
          {customers.map((customer) => (
            <li className="flex items-center justify-between gap-2 px-3 py-2.5" key={customer.id}>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{customer.name}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {customer.phone}
                </span>
                {customer.neighborhood ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {customer.neighborhood}
                    {customer.address ? ` — ${customer.address}` : ''}
                  </span>
                ) : null}
              </div>
              <div className="flex gap-1">
                <Button
                  onClick={() => {
                    setEditing(customer);
                    setFormOpen(true);
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  disabled={deleteCustomer.isPending}
                  onClick={() => handleDelete(customer)}
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

      <CustomerFormDialog customer={editing} onOpenChange={setFormOpen} open={formOpen} />
    </div>
  );
}
