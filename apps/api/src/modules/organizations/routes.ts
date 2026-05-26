import type { FastifyPluginAsync } from 'fastify';

import { getDeliverySettingsHandler, updateDeliverySettingsHandler } from './handlers.js';

export const organizationRoutes: FastifyPluginAsync = async (app) => {
  app.get('/delivery-settings', { preHandler: app.requireAuth }, getDeliverySettingsHandler);
  app.patch(
    '/delivery-settings',
    { preHandler: app.requireRole(['owner', 'manager']) },
    updateDeliverySettingsHandler,
  );
};
