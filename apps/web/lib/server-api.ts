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

export async function getCurrentUser(): Promise<CurrentUserResponse | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';
  const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
    headers: {
      cookie: cookies().toString(),
    },
    cache: 'no-store',
  });

  if (!response.ok) return null;
  return response.json() as Promise<CurrentUserResponse>;
}
