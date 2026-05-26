'use client';

import { CircleSlash, CircleX, Package, Receipt, TrendingUp } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { formatPrice } from '@/features/cardapio/utils/format-price';

import type { SummaryReport } from '@/features/relatorios/types';

type SummaryCardsProps = {
  data?: SummaryReport;
  loading?: boolean;
};

export function SummaryCards({ data, loading }: SummaryCardsProps) {
  const cards = [
    {
      icon: Receipt,
      label: 'Pedidos finalizados',
      value: data ? data.finishedOrders.toString() : '—',
      tone: 'text-emerald-600',
    },
    {
      icon: CircleX,
      label: 'Cancelados',
      value: data ? data.cancelledOrders.toString() : '—',
      tone: 'text-red-600',
    },
    {
      icon: TrendingUp,
      label: 'Receita',
      value: data ? formatPrice(data.revenue) : '—',
      tone: 'text-primary',
    },
    {
      icon: CircleSlash,
      label: 'Ticket médio',
      value: data ? formatPrice(data.averageTicket) : '—',
      tone: 'text-sky-600',
    },
    {
      icon: Package,
      label: 'Itens vendidos',
      value: data ? data.itemsSold.toString() : '—',
      tone: 'text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm" key={card.label}>
            <div className="flex items-center gap-2">
              <Icon className={cn('h-4 w-4', card.tone)} />
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            {loading ? <Skeleton className="h-7 w-20" /> : <span className="text-xl font-semibold">{card.value}</span>}
          </div>
        );
      })}
    </div>
  );
}
