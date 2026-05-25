import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Parâmetros compatíveis com o default do Better Auth (scrypt).
// Se mudarmos o hasher do Better Auth no Passo 1.4, atualizar aqui também.
const SCRYPT_PARAMS = { N: 16384, r: 16, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
// 128 * N * r * p ≈ 32MB; ampliamos o limite para evitar ERR_CRYPTO_INVALID_SCRYPT_PARAMS.
const MAX_MEM = 128 * 1024 * 1024;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const derived = scryptSync(password, salt, KEY_LENGTH, {
    ...SCRYPT_PARAMS,
    maxmem: MAX_MEM,
  });
  return `${salt}:${derived.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const derived = scryptSync(password, salt, KEY_LENGTH, {
    ...SCRYPT_PARAMS,
    maxmem: MAX_MEM,
  });
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
