'use client';

import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

import { formatPrice } from '@/features/cardapio/utils/format-price';

import type { CashMovement } from '@/features/caixa/types';

const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function MovementsList({ movements }: { movements: CashMovement[] }) {
  if (movements.length === 0) {
    return (
      <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
        Nenhum movimento registrado ainda.
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y rounded-md border bg-card">
      {movements.map((movement) => {
        const isDeposit = movement.type === 'deposit';
        const Icon = isDeposit ? ArrowUpCircle : ArrowDownCircle;
        return (
          <li className="flex items-start gap-3 px-3 py-2.5" key={movement.id}>
            <Icon
              className={cn('mt-0.5 h-4 w-4', isDeposit ? 'text-emerald-500' : 'text-red-500')}
            />
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-medium">
                {isDeposit ? 'Suprimento' : 'Sangria'} — {formatPrice(movement.amount)}
              </span>
              <span className="text-xs text-muted-foreground">{movement.reason}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {timeFormatter.format(new Date(movement.createdAt))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
