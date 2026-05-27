import {
  type PrismaClient,
  type TenantTx,
  type WithTenantOptions,
  prisma,
  withTenantTx,
} from '@cafe/db';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }

  interface FastifyRequest {
    // Executa fn em transação Postgres com app.current_org = request.tenantId.
    // Use SEMPRE que tocar tabelas tenant-bound — quando RLS for ativado, é o
    // único caminho que continua funcionando para a role de runtime.
    withTenant: <T>(
      fn: (tx: TenantTx) => Promise<T>,
      options?: WithTenantOptions,
    ) => Promise<T>;
  }
}

export const prismaPlugin = fp(
  async (app) => {
    await prisma.$connect();
    app.decorate('prisma', prisma);

    app.decorateRequest('withTenant', function (
      this: { tenantId: string | null },
      fn,
      options,
    ) {
      if (!this.tenantId) {
        throw new Error(
          'withTenant chamado sem tenantId — use requireRole/requireAuth/requirePrinterOrRole antes',
        );
      }
      return withTenantTx(prisma, this.tenantId, fn, options);
    });

    app.addHook('onClose', async () => {
      await prisma.$disconnect();
    });
  },
  { name: 'prisma' },
);
