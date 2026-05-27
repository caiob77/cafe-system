import { CheckCircle2, Crown, FileBarChart, ShoppingBasket, Users } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type PlanCardProps = {
  plan: 'free' | 'pro';
  planExpiresAt: string | null;
  limits: {
    dailyOrders: number | null;
    members: number | null;
    advancedReports: boolean;
  };
  usage: {
    ordersToday: number;
    members: number;
  };
};

function formatLimit(value: number | null): string {
  return value === null ? 'ilimitado' : value.toString();
}

function progressPercent(used: number, limit: number | null): number {
  if (limit === null || limit === 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function PlanCard({ plan, planExpiresAt, limits, usage }: PlanCardProps) {
  const planLabel = plan === 'pro' ? 'Pro' : 'Free';
  const ordersPct = progressPercent(usage.ordersToday, limits.dailyOrders);
  const membersPct = progressPercent(usage.members, limits.members);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">Plano {planLabel}</h2>
                {planExpiresAt ? (
                  <p className="text-xs text-muted-foreground">
                    Renova em {new Date(planExpiresAt).toLocaleDateString('pt-BR')}
                  </p>
                ) : null}
              </div>
            </div>
            {plan === 'free' ? (
              <Button asChild>
                <Link href="/upgrade">Fazer upgrade</Link>
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <UsageRow
            icon={ShoppingBasket}
            label="Pedidos hoje"
            used={usage.ordersToday}
            limit={limits.dailyOrders}
            percent={ordersPct}
          />
          <UsageRow
            icon={Users}
            label="Usuários"
            used={usage.members}
            limit={limits.members}
            percent={membersPct}
          />
          <div className="flex items-center justify-between gap-3 rounded-md border bg-background p-3">
            <div className="flex items-center gap-2">
              <FileBarChart className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">Relatórios avançados</p>
            </div>
            {limits.advancedReports ? (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Disponível
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Somente no Pro</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsageRow({
  icon: Icon,
  label,
  used,
  limit,
  percent,
}: {
  icon: typeof ShoppingBasket;
  label: string;
  used: number;
  limit: number | null;
  percent: number;
}) {
  const overLimit = limit !== null && used >= limit;
  return (
    <div className="space-y-2 rounded-md border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm">{label}</p>
        </div>
        <p className={`text-sm font-medium ${overLimit ? 'text-destructive' : 'text-foreground'}`}>
          {used} / {formatLimit(limit)}
        </p>
      </div>
      {limit !== null ? (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full ${overLimit ? 'bg-destructive' : 'bg-primary'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
