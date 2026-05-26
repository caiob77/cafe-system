import { ReportsContainer } from '@/features/relatorios/containers/reports-container';

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Indicadores de vendas, ticket médio, produtos e pagamentos por período.
        </p>
      </header>
      <ReportsContainer />
    </div>
  );
}
