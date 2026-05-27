'use client';

import { Ban, ChevronLeft, ChevronRight, Crown, Loader2, RefreshCw, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ApiError, apiClient } from '@/lib/api-client';

type Tenant = {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro';
  suspended: boolean;
  setupCompleted: boolean;
  createdAt: string;
  owner: { id: string; name: string; email: string } | null;
  ordersTotal: number;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type Filters = {
  search: string;
  status: 'all' | 'active' | 'suspended';
  plan: 'all' | 'free' | 'pro';
};

export function AdminTenantsTable({
  tenants,
  pagination,
  filters,
}: {
  tenants: Tenant[];
  pagination: Pagination;
  filters: Filters;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.search);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  function applyFilters(next: Partial<Filters & { page: number }>) {
    const params = new URLSearchParams();
    const merged = { ...filters, page: 1, ...next };
    if (merged.search) params.set('search', merged.search);
    if (merged.status !== 'all') params.set('status', merged.status);
    if (merged.plan !== 'all') params.set('plan', merged.plan);
    if (merged.page > 1) params.set('page', merged.page.toString());
    startTransition(() => {
      router.push(`/admin${params.toString().length > 0 ? `?${params.toString()}` : ''}`);
    });
  }

  async function updateTenant(id: string, body: Record<string, unknown>) {
    setError(null);
    setActingOn(id);
    try {
      await apiClient(`/api/v1/admin/tenants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível atualizar o tenant.');
    } finally {
      setActingOn(null);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applyFilters({ search });
              }}
              placeholder="Buscar nome ou slug"
              value={search}
            />
          </div>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            onChange={(event) => applyFilters({ status: event.target.value as Filters['status'] })}
            value={filters.status}
          >
            <option value="all">Todos status</option>
            <option value="active">Ativos</option>
            <option value="suspended">Suspensos</option>
          </select>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            onChange={(event) => applyFilters({ plan: event.target.value as Filters['plan'] })}
            value={filters.plan}
          >
            <option value="all">Todos planos</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
          <Button disabled={isPending} onClick={() => applyFilters({ search })} type="button">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Filtrar
          </Button>
        </div>

        {error ? <Alert variant="destructive">{error}</Alert> : null}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2">Plano</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Pedidos</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                    Nenhum tenant encontrado.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr className="border-b last:border-b-0" key={tenant.id}>
                    <td className="px-3 py-3">
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                    </td>
                    <td className="px-3 py-3">
                      {tenant.owner ? (
                        <div>
                          <p>{tenant.owner.name}</p>
                          <p className="text-xs text-muted-foreground">{tenant.owner.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                          tenant.plan === 'pro'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {tenant.plan === 'pro' ? <Crown className="h-3 w-3" /> : null}
                        {tenant.plan.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {tenant.suspended ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                          <Ban className="h-3 w-3" />
                          Suspenso
                        </span>
                      ) : tenant.setupCompleted ? (
                        <span className="text-xs text-emerald-600">Ativo</span>
                      ) : (
                        <span className="text-xs text-amber-600">Setup pendente</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">{tenant.ordersTotal}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          disabled={actingOn === tenant.id}
                          onClick={() =>
                            updateTenant(tenant.id, {
                              plan: tenant.plan === 'pro' ? 'free' : 'pro',
                            })
                          }
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          {actingOn === tenant.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          {tenant.plan === 'pro' ? 'Reverter Free' : 'Marcar Pro'}
                        </Button>
                        <Button
                          disabled={actingOn === tenant.id}
                          onClick={() => updateTenant(tenant.id, { suspended: !tenant.suspended })}
                          size="sm"
                          type="button"
                          variant={tenant.suspended ? 'secondary' : 'destructive'}
                        >
                          {actingOn === tenant.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Ban className="h-3 w-3" />
                          )}
                          {tenant.suspended ? 'Reativar' : 'Suspender'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Página {pagination.page} de {Math.max(1, pagination.totalPages)} · {pagination.total}{' '}
            tenant{pagination.total === 1 ? '' : 's'}
          </p>
          <div className="flex gap-2">
            <Button
              disabled={pagination.page <= 1 || isPending}
              onClick={() => applyFilters({ page: pagination.page - 1 })}
              size="sm"
              type="button"
              variant="ghost"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              disabled={pagination.page >= pagination.totalPages || isPending}
              onClick={() => applyFilters({ page: pagination.page + 1 })}
              size="sm"
              type="button"
              variant="ghost"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
