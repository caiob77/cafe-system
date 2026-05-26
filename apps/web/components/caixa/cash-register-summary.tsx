'use client';

import { ArrowDown, ArrowUp, Banknote, Coins, CreditCard, Smartphone } from 'lucide-react';

import { cn } from '@/lib/utils';

import { formatPrice } from '@/features/cardapio/utils/format-price';

import type { CashRegister, CashRegisterSummary } from '@/features/caixa/types';

type CashRegisterSummaryProps = {
  register: CashRegister;
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function CashRegisterSummaryCard({ register }: CashRegisterSummaryProps) {
  const summary = register.summary;
  const flow = summary?.cashFlow;
  const payments = summary?.payments;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <p className="text-xs text-muted-foreground">Aberto em</p>
        <p className="mt-1 text-sm font-medium">{dateFormatter.format(new Date(register.openedAt))}</p>
        <p className="mt-3 text-xs text-muted-foreground">Valor inicial</p>
        <p className="text-lg font-semibold">{formatPrice(register.initialAmount)}</p>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <p className="text-xs text-muted-foreground">Esperado em caixa físico</p>
        <p className="text-lg font-semibold">{formatPrice(flow?.expected ?? register.initialAmount)}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <ArrowUp className="h-3 w-3 text-emerald-500" />
            <span>Suprimentos {formatPrice(flow?.deposits ?? '0')}</span>
          </div>
          <div className="flex items-center gap-1">
            <ArrowDown className="h-3 w-3 text-red-500" />
            <span>Sangrias {formatPrice(flow?.withdrawals ?? '0')}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <p className="text-xs text-muted-foreground">Pagamentos recebidos</p>
        <p className="text-lg font-semibold">{formatPrice(payments?.total ?? '0')}</p>
        <p className="text-xs text-muted-foreground">{payments?.count ?? 0} transações</p>
      </div>

      <PaymentBreakdown payments={payments ?? undefined} />
    </div>
  );
}

function PaymentBreakdown({ payments }: { payments: CashRegisterSummary['payments'] | undefined }) {
  if (!payments) return null;
  const rows: Array<{ icon: typeof Banknote; label: string; value: string; className: string }> = [
    { icon: Coins, label: 'Dinheiro', value: payments.cash, className: 'text-amber-600' },
    { icon: CreditCard, label: 'Crédito', value: payments.credit_card, className: 'text-sky-600' },
    { icon: CreditCard, label: 'Débito', value: payments.debit_card, className: 'text-blue-600' },
    { icon: Smartphone, label: 'Pix', value: payments.pix, className: 'text-emerald-600' },
  ];

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm lg:col-span-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Pagamentos por método
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3" key={row.label}>
              <Icon className={cn('h-5 w-5', row.className)} />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{row.label}</span>
                <span className="text-sm font-semibold">{formatPrice(row.value)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
