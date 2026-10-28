export const roleLabel = {
  owner: 'Proprietário',
  manager: 'Gerente',
  attendant: 'Atendente',
  kitchen: 'Cozinha',
} as const;

export const inviteRoles = ['manager', 'attendant', 'kitchen'] as const;

export type InviteRole = (typeof inviteRoles)[number];

export function labelRole(role: string) {
  if (role in roleLabel) return roleLabel[role as keyof typeof roleLabel];
  return role;
}
