import { Check, Crown, MessageCircle, X } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { getCurrentPlan } from '@/lib/server-api';

const SALES_WHATSAPP = '5592981502831';
const SALES_EMAIL = 'caio.beniel55@gmail.com';

type PlanFeature = {
  label: string;
  free: boolean | string;
  pro: boolean | string;
};

const FEATURES: PlanFeature[] = [
  { label: 'Pedidos por dia', free: '50', pro: 'ilimitado' },
  { label: 'Usuários', free: '2', pro: 'ilimitado' },
  { label: 'Cardápio com fotos', free: true, pro: true },
  { label: 'Mesas e delivery', free: true, pro: true },
  { label: 'Caixa e fechamento', free: true, pro: true },
  { label: 'Resumo do dia', free: true, pro: true },
  { label: 'Relatório de vendas por período', free: false, pro: true },
  { label: 'Relatório de produtos mais vendidos', free: false, pro: true },
  { label: 'Relatório por forma de pagamento', free: false, pro: true },
  { label: 'Suporte prioritário', free: false, pro: true },
];

export default async function UpgradePage() {
  const planResponse = await getCurrentPlan();
  const currentPlan = planResponse?.data.plan ?? 'free';

  const whatsappUrl = `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(
    'Olá! Quero fazer upgrade do meu café para o plano Pro.',
  )}`;
  const mailtoUrl = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(
    'Upgrade para Pro',
  )}&body=${encodeURIComponent('Olá! Quero fazer upgrade para o plano Pro.')}`;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Faça upgrade para o Pro</h1>
        <p className="text-sm text-muted-foreground">
          Desbloqueie pedidos ilimitados, mais usuários e relatórios completos.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <PlanColumn
          name="Free"
          subtitle="O que você tem agora"
          isCurrent={currentPlan === 'free'}
          features={FEATURES.map((f) => ({ label: f.label, value: f.free }))}
          accent={false}
        />
        <PlanColumn
          name="Pro"
          subtitle="Acesso total ao sistema"
          isCurrent={currentPlan === 'pro'}
          features={FEATURES.map((f) => ({ label: f.label, value: f.pro }))}
          accent
        />
      </div>

      {currentPlan === 'free' ? (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Falar com vendas</h2>
            <p className="text-sm text-muted-foreground">
              O pagamento é combinado direto com a gente. Escolha o canal que preferir.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1">
              <a href={whatsappUrl} rel="noopener noreferrer" target="_blank">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </Button>
            <Button asChild className="flex-1" variant="secondary">
              <a href={mailtoUrl}>
                <MessageCircle className="h-4 w-4" />
                E-mail
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Crown className="h-5 w-5 text-primary" />
            <p className="text-sm">
              Você já está no plano Pro. Acompanhe os limites em{' '}
              <Link className="font-medium underline" href="/configuracoes/plano">
                Configurações → Plano
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PlanColumn({
  name,
  subtitle,
  isCurrent,
  features,
  accent,
}: {
  name: string;
  subtitle: string;
  isCurrent: boolean;
  features: Array<{ label: string; value: boolean | string }>;
  accent: boolean;
}) {
  return (
    <Card className={accent ? 'border-primary shadow-md' : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{name}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          {isCurrent ? (
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              Atual
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {features.map((feature) => (
          <div className="flex items-center justify-between gap-3 text-sm" key={feature.label}>
            <span className="text-muted-foreground">{feature.label}</span>
            <FeatureValue value={feature.value} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FeatureValue({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="font-medium">{value}</span>;
  }
  return value ? (
    <Check className="h-4 w-4 text-emerald-600" />
  ) : (
    <X className="h-4 w-4 text-muted-foreground/50" />
  );
}
