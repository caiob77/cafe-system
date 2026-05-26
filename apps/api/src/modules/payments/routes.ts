import type { FastifyPluginAsync } from 'fastify';

import { createOrderPaymentHandler, listOrderPaymentsHandler } from './handlers.js';

export const orderPaymentRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.requireAuth }, listOrderPaymentsHandler);

  app.post(
    '/',
    { preHandler: app.requireRole(['owner', 'manager', 'attendant']) },
    createOrderPaymentHandler,
  );
};
