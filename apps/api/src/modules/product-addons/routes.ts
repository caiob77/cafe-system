import type { FastifyPluginAsync } from 'fastify';

import {
  createProductAddonHandler,
  deleteProductAddonHandler,
  listProductAddonsHandler,
  updateProductAddonHandler,
} from './handlers.js';

export const productAddonRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.requireAuth }, listProductAddonsHandler);

  app.post('/', { preHandler: app.requireRole(['owner', 'manager']) }, createProductAddonHandler);

  app.put('/:id', { preHandler: app.requireRole(['owner', 'manager']) }, updateProductAddonHandler);

  app.delete(
    '/:id',
    { preHandler: app.requireRole(['owner', 'manager']) },
    deleteProductAddonHandler,
  );
};
