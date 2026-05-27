import { AdminTenantsTable } from '@/components/admin/admin-tenants-table';
import { MetricsCards } from '@/components/admin/metrics-cards';
import { Alert } from '@/components/ui/alert';
import { getAdminMetrics, getAdminTenants } from '@/lib/server-api';

type SearchParams = {
  page?: string;
  search?: string;
  status?: 'all' | 'active' | 'suspended';
  plan?: 'all' | 'free' | 'pro';
};

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const page = Number(searchParams.page ?? '1') || 1;
  const [metrics, tenants] = await Promise.all([
    getAdminMetrics(),
    getAdminTenants({
      page,
      pageSize: 20,
      search: searchParams.search,
      status: searchParams.status ?? 'all',
      plan: searchParams.plan ?? 'all',
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Painel admin</h1>
        <p className="text-sm text-muted-foreground">
          Métricas globais e gestão de tenants do SaaS.
        </p>
      </header>

      {metrics ? (
        <MetricsCards data={metrics.data} />
      ) : (
        <Alert variant="destructive">Não foi possível carregar as métricas.</Alert>
      )}

      {tenants ? (
        <AdminTenantsTable
          tenants={tenants.data}
          pagination={tenants.pagination}
          filters={{
            search: searchParams.search ?? '',
            status: searchParams.status ?? 'all',
            plan: searchParams.plan ?? 'all',
          }}
        />
      ) : (
        <Alert variant="destructive">Não foi possível carregar a lista de tenants.</Alert>
      )}
    </div>
  );
}
