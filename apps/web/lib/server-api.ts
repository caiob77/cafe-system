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
