import type { FastifyPluginAsync } from 'fastify';

import {
  createDeliveryFeeHandler,
  deleteDeliveryFeeHandler,
  listDeliveryFeesHandler,
  updateDeliveryFeeHandler,
} from './handlers.js';

export const deliveryFeeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.requireAuth }, listDeliveryFeesHandler);
  app.post('/', { preHandler: app.requireRole(['owner', 'manager']) }, createDeliveryFeeHandler);
  app.patch(
    '/:id',
    { preHandler: app.requireRole(['owner', 'manager']) },
    updateDeliveryFeeHandler,
  );
  app.delete(
    '/:id',
    { preHandler: app.requireRole(['owner', 'manager']) },
    deleteDeliveryFeeHandler,
  );
};
