import type { OrderStatus, OrderType } from '../types';

export function shouldSettleOnAdvance(type: OrderType, next: OrderStatus): boolean {
  if (next === 'finished') return true;
  return type === 'delivery' && next === 'delivered';
}
