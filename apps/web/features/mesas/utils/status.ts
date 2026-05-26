import type { TableStatus } from '../types';

export const tableStatusLabel: Record<TableStatus, string> = {
  free: 'Livre',
  occupied: 'Ocupada',
  awaiting_payment: 'Aguardando pagamento',
};

export const tableStatusStyle: Record<TableStatus, string> = {
  free: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  occupied: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-200',
  awaiting_payment: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-200',
};

export const tableStatusBadgeStyle: Record<TableStatus, string> = {
  free: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200',
  occupied: 'bg-red-500/15 text-red-700 dark:text-red-200',
  awaiting_payment: 'bg-amber-500/15 text-amber-700 dark:text-amber-200',
};
