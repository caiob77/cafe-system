import type { FastifyPluginAsync } from 'fastify';

import {
  completeSetupHandler,
  getDeliverySettingsHandler,
  getMeHandler,
  getPlanHandler,
  updateDeliverySettingsHandler,
  updateProfileHandler,
} from './handlers.js';
import {
  createMemberHandler,
  removeMemberHandler,
  updateMemberAccessHandler,
} from './member-handlers.js';

export const organizationRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', { preHandler: app.requireAuth }, getMeHandler);

  app.patch(
    '/profile',
    { preHandler: app.requireRole(['owner', 'manager']) },
    updateProfileHandler,
  );

  app.post('/complete-setup', { preHandler: app.requireRole(['owner']) }, completeSetupHandler);

  app.get('/plan', { preHandler: app.requireAuth }, getPlanHandler);

  app.post('/members', { preHandler: app.requireRole(['owner']) }, createMemberHandler);
  app.patch(
    '/members/:memberId/access',
    { preHandler: app.requireRole(['owner']) },
    updateMemberAccessHandler,
  );
  app.delete('/members/:memberId', { preHandler: app.requireRole(['owner']) }, removeMemberHandler);

  app.get('/delivery-settings', { preHandler: app.requireAuth }, getDeliverySettingsHandler);
  app.patch(
    '/delivery-settings',
    { preHandler: app.requireRole(['owner', 'manager']) },
    updateDeliverySettingsHandler,
  );
};
