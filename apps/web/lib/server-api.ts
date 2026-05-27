import { cookies } from 'next/headers';

export type CurrentUserResponse = {
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
      image?: string | null;
    };
    session: {
      id: string;
      activeOrganizationId?: string | null;
    };
    tenantId: string | null;
    role: 'owner' | 'manager' | 'attendant' | 'kitchen' | null;
    isSuperAdmin: boolean;
  };
};

export type OrganizationResponse = {
  data: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    addressLine: string | null;
    phone: string | null;
    deliveryEnabled: boolean;
    deliverySchedule: Record<string, { open: string; close: string } | null> | null;
    defaultDeliveryFee: string | null;
    setupCompletedAt: string | null;
    setupCompleted: boolean;
    createdAt: string;
  };
};

const apiBase = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

async function authedFetch(path: string) {
  return fetch(`${apiBase()}${path}`, {
    headers: { cookie: cookies().toString() },
    cache: 'no-store',
  });
}

export async function getCurrentUser(): Promise<CurrentUserResponse | null> {
  const response = await authedFetch('/api/v1/auth/me');
  if (!response.ok) return null;
  return response.json() as Promise<CurrentUserResponse>;
}

export async function getCurrentOrganization(): Promise<OrganizationResponse | null> {
  const response = await authedFetch('/api/v1/organization/me');
  if (!response.ok) return null;
  return response.json() as Promise<OrganizationResponse>;
}

export type PlanResponse = {
  data: {
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
};

export async function getCurrentPlan(): Promise<PlanResponse | null> {
  const response = await authedFetch('/api/v1/organization/plan');
  if (!response.ok) return null;
  return response.json() as Promise<PlanResponse>;
}

export type AdminMetricsResponse = {
  data: {
    tenants: {
      total: number;
      active: number;
      suspended: number;
      free: number;
      pro: number;
    };
    orders: {
      total: number;
      today: number;
    };
    mrr: {
      estimated: number;
      currency: string;
      perProPlan: number;
    };
  };
};

export type AdminTenantsResponse = {
  data: Array<{
    id: string;
    name: string;
    slug: string;
    plan: 'free' | 'pro';
    planExpiresAt: string | null;
    suspended: boolean;
    suspendedAt: string | null;
    setupCompleted: boolean;
    createdAt: string;
    owner: { id: string; name: string; email: string } | null;
    ordersTotal: number;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export async function getAdminMetrics(): Promise<AdminMetricsResponse | null> {
  const response = await authedFetch('/api/v1/admin/metrics');
  if (!response.ok) return null;
  return response.json() as Promise<AdminMetricsResponse>;
}

export async function getAdminTenants(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: 'all' | 'active' | 'suspended';
  plan?: 'all' | 'free' | 'pro';
}): Promise<AdminTenantsResponse | null> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', params.page.toString());
  if (params.pageSize) qs.set('pageSize', params.pageSize.toString());
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  if (params.plan) qs.set('plan', params.plan);
  const query = qs.toString();
  const response = await authedFetch(`/api/v1/admin/tenants${query.length > 0 ? `?${query}` : ''}`);
  if (!response.ok) return null;
  return response.json() as Promise<AdminTenantsResponse>;
}
