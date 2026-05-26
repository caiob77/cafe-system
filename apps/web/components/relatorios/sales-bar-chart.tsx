'use client';

import { cn } from '@/lib/utils';

import { formatPrice } from '@/features/cardapio/utils/format-price';

import type { SalesReport } from '@/features/relatorios/types';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
});

type SalesBarChartProps = {
  data?: SalesReport;
};

export function SalesBarChart({ data }: SalesBarChartProps) {
  if (!data || data.buckets.length === 0) {
    return (
      <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
        Sem vendas no período selecionado.
      </p>
    );
  }

  const max = data.buckets.reduce((acc, bucket) => Math.max(acc, Number(bucket.revenue)), 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-1 overflow-x-auto pb-2">
        {data.buckets.map((bucket) => {
          const value = Number(bucket.revenue);
          const ratio = max > 0 ? value / max : 0;
          return (
            <div
              className="flex min-w-12 flex-1 flex-col items-center gap-1"
              key={bucket.bucket}
              title={`${dateFormatter.format(new Date(bucket.bucket))} — ${formatPrice(bucket.revenue)} • ${bucket.count} pedidos`}
            >
              <div
                className={cn(
                  'w-full rounded-t-md bg-primary/80 transition-colors hover:bg-primary',
                  ratio === 0 && 'bg-muted',
                )}
                style={{ height: `${Math.max(6, ratio * 160)}px` }}
              />
              <span className="text-[10px] text-muted-foreground">
                {dateFormatter.format(new Date(bucket.bucket))}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
        <span>{data.totals.count} pedidos no período</span>
        <span className="text-sm font-semibold text-foreground">
          {formatPrice(data.totals.revenue)}
        </span>
      </div>
    </div>
  );
}
