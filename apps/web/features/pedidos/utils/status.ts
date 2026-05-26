import type { OrderStatus, OrderType } from '../types';

export const orderStatusLabel: Record<OrderStatus, string> = {
  pending: 'Pendente',
  preparing: 'Em preparo',
  ready: 'Pronto',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

export const orderStatusBadgeStyle: Record<OrderStatus, string> = {
  pending: 'bg-slate-500/15 text-slate-700 dark:text-slate-200',
  preparing: 'bg-amber-500/15 text-amber-700 dark:text-amber-200',
  ready: 'bg-sky-500/15 text-sky-700 dark:text-sky-200',
  out_for_delivery: 'bg-blue-500/15 text-blue-700 dark:text-blue-200',
  delivered: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200',
  finished: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200',
  cancelled: 'bg-red-500/15 text-red-700 dark:text-red-200',
};

export type StatusActionsMap = Record<OrderStatus, OrderStatus[]>;

const TRANSITIONS: StatusActionsMap = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['finished'],
  finished: [],
  cancelled: [],
};

export function getAllowedTransitions(current: OrderStatus, type: OrderType): OrderStatus[] {
  return TRANSITIONS[current].filter((next) => {
    if (type === 'dine_in' && next === 'out_for_delivery') return false;
    if (type === 'delivery' && current === 'ready' && next === 'delivered') return false;
    return true;
  });
}

export function isActiveStatus(status: OrderStatus): boolean {
  return !['finished', 'cancelled'].includes(status);
}
