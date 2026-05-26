import type { FastifyPluginAsync } from 'fastify';

import {
  createCustomerHandler,
  deleteCustomerHandler,
  getCustomerHandler,
  listCustomersHandler,
  updateCustomerHandler,
} from './handlers.js';

export const customerRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.requireAuth }, listCustomersHandler);

  app.post(
    '/',
    { preHandler: app.requireRole(['owner', 'manager', 'attendant']) },
    createCustomerHandler,
  );

  app.get('/:id', { preHandler: app.requireAuth }, getCustomerHandler);

  app.patch(
    '/:id',
    { preHandler: app.requireRole(['owner', 'manager', 'attendant']) },
    updateCustomerHandler,
  );

  app.delete('/:id', { preHandler: app.requireRole(['owner', 'manager']) }, deleteCustomerHandler);
};
