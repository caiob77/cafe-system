import type { FastifyPluginAsync } from 'fastify';

import {
  completeSetupHandler,
  getDeliverySettingsHandler,
  getMeHandler,
  getPlanHandler,
  updateDeliverySettingsHandler,
  updateProfileHandler,
} from './handlers.js';

export const organizationRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', { preHandler: app.requireAuth }, getMeHandler);

  app.patch(
    '/profile',
    { preHandler: app.requireRole(['owner', 'manager']) },
    updateProfileHandler,
  );

  app.post(
    '/complete-setup',
    { preHandler: app.requireRole(['owner']) },
    completeSetupHandler,
  );

  app.get('/plan', { preHandler: app.requireAuth }, getPlanHandler);

  app.get('/delivery-settings', { preHandler: app.requireAuth }, getDeliverySettingsHandler);
  app.patch(
    '/delivery-settings',
    { preHandler: app.requireRole(['owner', 'manager']) },
    updateDeliverySettingsHandler,
  );
};
