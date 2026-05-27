import type { FastifyPluginAsync } from 'fastify';

import {
  getAdminMetricsHandler,
  listTenantsHandler,
  updateTenantHandler,
} from './handlers.js';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.requireSuperAdmin);

  app.get('/metrics', getAdminMetricsHandler);
  app.get('/tenants', listTenantsHandler);
  app.patch('/tenants/:id', updateTenantHandler);
};
