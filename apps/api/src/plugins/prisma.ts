import fp from 'fastify-plugin';
import { prisma, type PrismaClient } from '@cafe/db';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export const prismaPlugin = fp(
  async (app) => {
    await prisma.$connect();
    app.decorate('prisma', prisma);

    app.addHook('onClose', async () => {
      await prisma.$disconnect();
    });
  },
  { name: 'prisma' },
);
