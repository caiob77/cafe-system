import type { OrderStatus } from '../types';

/**
 * Espelha `canModifyOrderItems` do backend: itens só podem entrar/sair
 * enquanto o pedido está na fila de pendente. Uso exibicional — o backend
 * continua validando e responde 409 fora dessa janela.
 */
export function canModifyOrderItems(status: OrderStatus): boolean {
  return status === 'pending';
}
