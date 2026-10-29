export const roleLabel = {
  owner: 'Proprietário',
  manager: 'Gerente',
  attendant: 'Atendente',
  kitchen: 'Cozinha',
} as const;

export const memberRoles = ['manager', 'attendant', 'kitchen'] as const;

export type MemberRole = (typeof memberRoles)[number];

export function labelRole(role: string) {
  if (role in roleLabel) return roleLabel[role as keyof typeof roleLabel];
  return role;
}
