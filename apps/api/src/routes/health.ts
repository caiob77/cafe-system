import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    // Ping no Postgres p/ que o health reflita dependências críticas.
    let db: 'ok' | 'down' = 'ok';
    try {
      await app.prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      app.log.warn({ err }, 'health: db ping falhou');
      db = 'down';
    }

    return {
      status: db === 'ok' ? 'ok' : 'degraded',
      uptime: process.uptime(),
      db,
    };
  });
};
