import type { CurrentUserResponse } from '@/lib/server-api';

type AppRole = NonNullable<CurrentUserResponse['data']['role']>;

const accessByPrefix: Array<{ prefix: string; roles: AppRole[] }> = [
  { prefix: '/cozinha', roles: ['owner', 'manager', 'kitchen'] },
  { prefix: '/configuracoes', roles: ['owner', 'manager'] },
  { prefix: '/relatorios', roles: ['owner', 'manager'] },
  { prefix: '/cardapio', roles: ['owner', 'manager', 'attendant'] },
  { prefix: '/caixa', roles: ['owner', 'manager', 'attendant'] },
  { prefix: '/delivery', roles: ['owner', 'manager', 'attendant'] },
  { prefix: '/mesas', roles: ['owner', 'manager', 'attendant'] },
  { prefix: '/pedidos', roles: ['owner', 'manager', 'attendant'] },
];

export function canAccessRoute(pathname: string, role: AppRole | null) {
  if (!role) return false;
  const rule = accessByPrefix.find(({ prefix }) => pathname.startsWith(prefix));
  if (!rule) return true;
  return rule.roles.includes(role);
}
