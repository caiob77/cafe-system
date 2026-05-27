import { PlanCard } from '@/components/plano/plan-card';
import { Alert } from '@/components/ui/alert';
import { getCurrentPlan } from '@/lib/server-api';

export default async function PlanoPage() {
  const planResponse = await getCurrentPlan();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Plano</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe seu uso e veja os limites do seu plano.
        </p>
      </header>

      {planResponse ? (
        <PlanCard
          plan={planResponse.data.plan}
          planExpiresAt={planResponse.data.planExpiresAt}
          limits={planResponse.data.limits}
          usage={planResponse.data.usage}
        />
      ) : (
        <Alert variant="destructive">Não foi possível carregar os dados do plano.</Alert>
      )}
    </div>
  );
}
