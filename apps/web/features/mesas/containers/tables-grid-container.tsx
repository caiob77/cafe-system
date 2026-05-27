'use client';

import { Loader2, Plus, Utensils } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { TableCard } from '@/components/mesas/table-card';
import { TableFormDialog } from '@/components/mesas/table-form-dialog';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';

import { useSessionUI } from '@/features/auth/context/session-ui-provider';
import {
  useCreateTable,
  useDeleteTable,
  useTables,
  useUpdateTable,
} from '@/features/mesas/api/use-tables';
import type { Table, TableInput } from '@/features/mesas/types';

const MANAGE_ROLES = new Set(['owner', 'manager']);

export function TablesGridContainer() {
  const router = useRouter();
  const session = useSessionUI();
  const role = session.role;
  const canManage = role !== null && MANAGE_ROLES.has(role);

  const tablesQuery = useTables();
  const createTable = useCreateTable();
  const updateTable = useUpdateTable();
  const deleteTable = useDeleteTable();

  const [dialog, setDialog] = useState<{ open: boolean; target: Table | null }>({
    open: false,
    target: null,
  });
  const [formError, setFormError] = useState<string | null>(null);

  function handleSelect(table: Table) {
    router.push(`/mesas/${table.id}`);
  }

  function openCreate() {
    setFormError(null);
    setDialog({ open: true, target: null });
  }

  function openEdit(table: Table) {
    setFormError(null);
    setDialog({ open: true, target: table });
  }

  async function handleSubmit(input: TableInput) {
    setFormError(null);
    try {
      if (dialog.target) {
        await updateTable.mutateAsync({ id: dialog.target.id, ...input });
      } else {
        await createTable.mutateAsync(input);
      }
      setDialog({ open: false, target: null });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Não foi possível salvar.');
    }
  }

  async function handleDelete(table: Table) {
    const ok = window.confirm(`Remover a mesa #${table.number}?`);
    if (!ok) return;
    try {
      await deleteTable.mutateAsync(table.id);
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Não foi possível remover.');
    }
  }

  const tables = tablesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Toque numa mesa livre para abrir um novo pedido, ou em uma ocupada para acompanhar.
        </p>
        {canManage ? (
          <Button onClick={openCreate} size="touch" type="button">
            <Plus className="h-4 w-4" />
            Nova mesa
          </Button>
        ) : null}
      </div>

      {tablesQuery.isLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 py-12 text-center">
          <Utensils className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma mesa cadastrada ainda.</p>
          {canManage ? (
            <Button onClick={openCreate} size="touch" type="button">
              <Plus className="h-4 w-4" />
              Cadastrar primeira mesa
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {tables.map((table) => (
            <TableCard
              canManage={canManage}
              key={table.id}
              onDelete={handleDelete}
              onEdit={openEdit}
              onSelect={handleSelect}
              table={table}
            />
          ))}
        </div>
      )}

      <TableFormDialog
        error={formError}
        loading={createTable.isPending || updateTable.isPending}
        onOpenChange={(open) => setDialog((prev) => ({ open, target: open ? prev.target : null }))}
        onSubmit={handleSubmit}
        open={dialog.open}
        table={dialog.target}
      />
    </div>
  );
}
