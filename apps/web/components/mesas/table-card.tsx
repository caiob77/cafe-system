'use client';

import { Pencil, Trash2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { Table } from '@/features/mesas/types';
import {
  tableStatusBadgeStyle,
  tableStatusLabel,
  tableStatusStyle,
} from '@/features/mesas/utils/status';

type TableCardProps = {
  table: Table;
  canManage: boolean;
  onSelect: (table: Table) => void;
  onEdit: (table: Table) => void;
  onDelete: (table: Table) => void;
};

export function TableCard({ table, canManage, onSelect, onEdit, onDelete }: TableCardProps) {
  return (
    <article
      className={cn(
        'relative flex flex-col rounded-xl border-2 p-4 shadow-sm transition-shadow hover:shadow-md',
        tableStatusStyle[table.status],
      )}
    >
      <button
        aria-label={`Abrir mesa ${table.number} (${tableStatusLabel[table.status]})`}
        className="flex flex-1 flex-col gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onSelect(table)}
        type="button"
      >
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold">#{table.number}</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
              tableStatusBadgeStyle[table.status],
            )}
          >
            {tableStatusLabel[table.status]}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>{table.capacity} lugares</span>
        </div>
      </button>

      {canManage ? (
        <div className="mt-3 flex justify-end gap-1">
          <Button
            aria-label={`Editar mesa ${table.number}`}
            onClick={() => onEdit(table)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            aria-label={`Remover mesa ${table.number}`}
            disabled={table.status !== 'free'}
            onClick={() => onDelete(table)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ) : null}
    </article>
  );
}
