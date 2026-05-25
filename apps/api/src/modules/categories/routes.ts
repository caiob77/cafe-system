import type { FastifyPluginAsync } from 'fastify';

import {
  createCategoryHandler,
  deleteCategoryHandler,
  listCategoriesHandler,
  reorderCategoriesHandler,
  updateCategoryHandler,
} from './handlers.js';

export const categoryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.requireAuth }, listCategoriesHandler);

  app.post('/', { preHandler: app.requireRole(['owner', 'manager']) }, createCategoryHandler);

  app.put(
    '/reorder',
    { preHandler: app.requireRole(['owner', 'manager']) },
    reorderCategoriesHandler,
  );

  app.put('/:id', { preHandler: app.requireRole(['owner', 'manager']) }, updateCategoryHandler);

  app.delete('/:id', { preHandler: app.requireRole(['owner', 'manager']) }, deleteCategoryHandler);
};
