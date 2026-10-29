/**
 * Membros cadastrados pelo dono digitam `usuario@slug-do-cafe` no login. O Better Auth
 * exige e-mail, então a conta guarda `usuario@<id-do-cafe>.<MEMBER_EMAIL_DOMAIN>`:
 * o id nunca muda, então trocar o slug não mexe nas contas. No login, o navegador envia
 * `usuario@slug.<MEMBER_EMAIL_DOMAIN>` e a API troca o slug pelo id antes de validar.
 * Slug e id nunca têm ponto e e-mail real sempre tem, o que separa os formatos.
 *
 * Sem zod de propósito: o web importa este arquivo na tela de login.
 */
export const MEMBER_EMAIL_DOMAIN = 'membros.cafe.local';

export const MEMBER_USERNAME_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

export const ORGANIZATION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** E-mail guardado na conta do membro. */
export function memberEmail(username: string, organizationId: string): string {
  return `${username}@${organizationId}.${MEMBER_EMAIL_DOMAIN}`.toLowerCase();
}

export function isMemberEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`.${MEMBER_EMAIL_DOMAIN}`);
}

/**
 * Separa `usuario@<escopo>.<MEMBER_EMAIL_DOMAIN>`. O escopo é o slug no login enviado
 * pelo navegador e o id do café no e-mail guardado.
 */
export function parseMemberEmail(email: string): { username: string; scope: string } | null {
  const value = email.trim().toLowerCase();
  if (!isMemberEmail(value)) return null;
  const local = value.slice(0, -(MEMBER_EMAIL_DOMAIN.length + 1));
  const at = local.lastIndexOf('@');
  if (at <= 0 || at === local.length - 1) return null;
  const scope = local.slice(at + 1);
  if (scope.includes('.')) return null;
  return { username: local.slice(0, at), scope };
}

/** Converte o que foi digitado no login (`usuario@slug` ou e-mail) no e-mail enviado à API. */
export function loginIdentifierToEmail(identifier: string): string {
  const value = identifier.trim().toLowerCase();
  const at = value.lastIndexOf('@');
  if (at <= 0) return value;
  const domain = value.slice(at + 1);
  if (domain.length === 0 || domain.includes('.')) return value;
  return `${value}.${MEMBER_EMAIL_DOMAIN}`;
}

export function memberLogin(username: string, organizationSlug: string): string {
  return `${username}@${organizationSlug}`.toLowerCase();
}
