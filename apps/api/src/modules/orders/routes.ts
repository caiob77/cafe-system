import type { FastifyPluginAsync } from 'fastify';

import {
  addOrderItemHandler,
  createOrderHandler,
  getOrderHandler,
  listOrdersHandler,
  removeOrderItemHandler,
  updateOrderStatusHandler,
} from './handlers.js';

export const orderRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.requireAuth }, listOrdersHandler);
  app.get('/:id', { preHandler: app.requireAuth }, getOrderHandler);

  app.post(
    '/',
    { preHandler: app.requireRole(['owner', 'manager', 'attendant']) },
    createOrderHandler,
  );

  app.post(
    '/:id/items',
    { preHandler: app.requireRole(['owner', 'manager', 'attendant']) },
    addOrderItemHandler,
  );

  app.delete(
    '/:id/items/:itemId',
    { preHandler: app.requireRole(['owner', 'manager', 'attendant']) },
    removeOrderItemHandler,
  );

  app.patch(
    '/:id/status',
    { preHandler: app.requireRole(['owner', 'manager', 'attendant', 'kitchen']) },
    updateOrderStatusHandler,
  );
};
