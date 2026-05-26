'use client';

import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { PaymentsBreakdown } from '@/components/relatorios/payments-breakdown';
import { SalesBarChart } from '@/components/relatorios/sales-bar-chart';
import { SummaryCards } from '@/components/relatorios/summary-cards';
import { TopProducts } from '@/components/relatorios/top-products';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

import {
  usePaymentsReport,
  useProductsReport,
  useSalesReport,
  useSummaryReport,
} from '../api/use-reports';
import type { ReportPeriod } from '../types';

function defaultFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return date.toISOString().slice(0, 10);
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ReportsContainer() {
  const [dateFrom, setDateFrom] = useState(defaultFrom());
  const [dateTo, setDateTo] = useState(defaultTo());
  const [period, setPeriod] = useState<ReportPeriod>('day');

  const baseFilters = useMemo(
    () => ({
      dateFrom,
      dateTo: `${dateTo}T23:59:59.999Z`,
    }),
    [dateFrom, dateTo],
  );

  const summaryQuery = useSummaryReport(baseFilters);
  const salesQuery = useSalesReport({ ...baseFilters, period });
  const productsQuery = useProductsReport({ ...baseFilters, limit: 10 });
  const paymentsQuery = usePaymentsReport(baseFilters);

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date-from">De</Label>
          <Input
            id="date-from"
            onChange={(event) => setDateFrom(event.target.value)}
            type="date"
            value={dateFrom}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date-to">Até</Label>
          <Input
            id="date-to"
            onChange={(event) => setDateTo(event.target.value)}
            type="date"
            value={dateTo}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="period">Agrupar por</Label>
          <Select
            id="period"
            onChange={(event) => setPeriod(event.target.value as ReportPeriod)}
            value={period}
          >
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mês</option>
          </Select>
        </div>
      </section>

      <SummaryCards data={summaryQuery.data} loading={summaryQuery.isLoading} />

      <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <header>
          <h2 className="text-sm font-semibold">Vendas no período</h2>
          <p className="text-xs text-muted-foreground">
            Receita por {period === 'day' ? 'dia' : period === 'week' ? 'semana' : 'mês'} dos
            pedidos finalizados.
          </p>
        </header>
        {salesQuery.isLoading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <SalesBarChart data={salesQuery.data} />
        )}
      </section>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
          <header>
            <h2 className="text-sm font-semibold">Top produtos</h2>
            <p className="text-xs text-muted-foreground">Os 10 mais vendidos do período.</p>
          </header>
          {productsQuery.isLoading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <TopProducts data={productsQuery.data} />
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
          <header>
            <h2 className="text-sm font-semibold">Pagamentos por método</h2>
            <p className="text-xs text-muted-foreground">Distribuição dos valores recebidos.</p>
          </header>
          {paymentsQuery.isLoading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <PaymentsBreakdown data={paymentsQuery.data} />
          )}
        </section>
      </div>
    </div>
  );
}
