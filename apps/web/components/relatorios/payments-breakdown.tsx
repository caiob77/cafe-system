'use client';

import { Coins, CreditCard, Smartphone } from 'lucide-react';

import { cn } from '@/lib/utils';

import { formatPrice } from '@/features/cardapio/utils/format-price';

import type { PaymentMethod, PaymentsReport } from '@/features/relatorios/types';

const methods: Array<{ key: PaymentMethod; label: string; icon: typeof Coins; tone: string }> = [
  { key: 'cash', label: 'Dinheiro', icon: Coins, tone: 'text-amber-600' },
  { key: 'credit_card', label: 'Crédito', icon: CreditCard, tone: 'text-sky-600' },
  { key: 'debit_card', label: 'Débito', icon: CreditCard, tone: 'text-blue-600' },
  { key: 'pix', label: 'Pix', icon: Smartphone, tone: 'text-emerald-600' },
];

export function PaymentsBreakdown({ data }: { data?: PaymentsReport }) {
  if (!data) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {methods.map((method) => {
          const entry = data.byMethod[method.key];
          const Icon = method.icon;
          return (
            <div className="flex items-center gap-3 rounded-md border bg-card p-3" key={method.key}>
              <Icon className={cn('h-5 w-5', method.tone)} />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{method.label}</span>
                <span className="text-sm font-semibold">{formatPrice(entry.amount)}</span>
                <span className="text-[10px] text-muted-foreground">
                  {entry.count} transações
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
        <span>Total no período</span>
        <span className="text-sm font-semibold text-foreground">{formatPrice(data.totals.amount)}</span>
      </div>
    </div>
  );
}
