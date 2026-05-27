import { Activity, Ban, Building2, Crown, DollarSign, ShoppingBasket } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

type MetricsData = {
  tenants: { total: number; active: number; suspended: number; free: number; pro: number };
  orders: { total: number; today: number };
  mrr: { estimated: number; currency: string; perProPlan: number };
};

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function MetricsCards({ data }: { data: MetricsData }) {
  const items = [
    {
      label: 'Tenants',
      value: data.tenants.total.toString(),
      hint: `${data.tenants.active} ativos, ${data.tenants.suspended} suspensos`,
      icon: Building2,
    },
    {
      label: 'MRR estimado',
      value: formatCurrency(data.mrr.estimated, data.mrr.currency),
      hint: `${data.tenants.pro} no Pro × ${formatCurrency(data.mrr.perProPlan, data.mrr.currency)}`,
      icon: DollarSign,
    },
    {
      label: 'Pedidos hoje',
      value: data.orders.today.toString(),
      hint: `${data.orders.total} no total`,
      icon: ShoppingBasket,
    },
    {
      label: 'Distribuição de planos',
      value: `${data.tenants.pro} Pro`,
      hint: `${data.tenants.free} no Free`,
      icon: Crown,
    },
    {
      label: 'Ativos',
      value: data.tenants.active.toString(),
      hint: `${Math.round((data.tenants.active / Math.max(1, data.tenants.total)) * 100)}% do total`,
      icon: Activity,
    },
    {
      label: 'Suspensos',
      value: data.tenants.suspended.toString(),
      hint: data.tenants.suspended === 0 ? 'Nenhum agora' : 'Verifique antes de remover',
      icon: Ban,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label}>
            <CardContent className="space-y-1 pt-6">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.hint}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
