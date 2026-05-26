import type { FastifyPluginAsync } from 'fastify';

import {
  createTableHandler,
  deleteTableHandler,
  listTablesHandler,
  updateTableHandler,
} from './handlers.js';

export const tableRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.requireAuth }, listTablesHandler);

  app.post('/', { preHandler: app.requireRole(['owner', 'manager']) }, createTableHandler);

  app.put('/:id', { preHandler: app.requireRole(['owner', 'manager']) }, updateTableHandler);

  app.delete('/:id', { preHandler: app.requireRole(['owner', 'manager']) }, deleteTableHandler);
};
