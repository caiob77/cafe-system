import { ReportsContainer } from '@/features/relatorios/containers/reports-container';

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Indicadores de vendas, ticket médio, produtos e pagamentos por período.
        </p>
      </header>
      <ReportsContainer />
    </div>
  );
}
