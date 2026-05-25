import type { FastifyPluginAsync } from 'fastify';

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.get('/auth/me', { preHandler: app.requireAuth }, async (request) => {
    return {
      data: {
        user: request.authSession?.user,
        session: request.authSession?.session,
        tenantId: request.tenantId,
        role: request.role,
      },
    };
  });

  app.get('/auth/owner-only', { preHandler: app.requireRole('owner') }, async (request) => {
    return {
      data: {
        userId: request.authSession?.user.id,
        tenantId: request.tenantId,
        role: request.role,
      },
    };
  });
};
