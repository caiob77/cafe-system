import type { FastifyPluginAsync } from 'fastify';

import {
  createProductHandler,
  deleteProductHandler,
  getProductHandler,
  listProductsHandler,
  updateProductAvailabilityHandler,
  updateProductHandler,
} from './handlers.js';

export const productRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.requireAuth }, listProductsHandler);
  app.get('/:id', { preHandler: app.requireAuth }, getProductHandler);

  app.post('/', { preHandler: app.requireRole(['owner', 'manager']) }, createProductHandler);

  app.put('/:id', { preHandler: app.requireRole(['owner', 'manager']) }, updateProductHandler);

  app.patch(
    '/:id/availability',
    { preHandler: app.requireRole(['owner', 'manager', 'attendant']) },
    updateProductAvailabilityHandler,
  );

  app.delete('/:id', { preHandler: app.requireRole(['owner', 'manager']) }, deleteProductHandler);
};
