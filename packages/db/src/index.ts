import { Prisma, PrismaClient } from '@prisma/client';
export { hashPassword, verifyPassword } from './password.js';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export { Prisma };
export * from '@prisma/client';

export type TenantTx = Prisma.TransactionClient;

export interface WithTenantOptions {
  isolationLevel?: Prisma.TransactionIsolationLevel;
  timeout?: number;
  maxWait?: number;
}

// Aceitamos apenas cuid/uuid/slugs curtos. SET não aceita bind params, então
// o valor entra interpolado — validar formato impede injection.
const TENANT_ID_PATTERN = /^[a-z0-9_-]{8,64}$/i;

/**
 * Abre uma transação Postgres e seta `app.current_org` (via SET LOCAL) antes
 * de invocar `fn`. Combinado com as policies RLS em post-migrate.sql, garante
 * isolamento multi-tenant no nível do banco — o app deixa de ser a única
 * barreira para vazar dados entre organizações.
 *
 * `SET LOCAL` só vale dentro de uma transação, daí o $transaction obrigatório.
 */
export async function withTenantTx<T>(
  client: PrismaClient,
  tenantId: string,
  fn: (tx: TenantTx) => Promise<T>,
  options?: WithTenantOptions,
): Promise<T> {
  if (!TENANT_ID_PATTERN.test(tenantId)) {
    throw new Error(`withTenantTx: tenantId em formato inválido: ${tenantId}`);
  }

  return client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_org = '${tenantId}'`);
    return fn(tx);
  }, options);
}
