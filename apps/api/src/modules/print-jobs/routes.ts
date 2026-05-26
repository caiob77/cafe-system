import type { FastifyPluginAsync } from 'fastify';

import {
  getPrintJobHandler,
  listPrintJobsHandler,
  retryPrintJobHandler,
  updatePrintJobStatusHandler,
} from './handlers.js';

export const printJobRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.requireAuth }, listPrintJobsHandler);
  app.get('/:id', { preHandler: app.requireAuth }, getPrintJobHandler);
  app.patch('/:id/status', { preHandler: app.requireAuth }, updatePrintJobStatusHandler);
  app.post(
    '/:id/retry',
    { preHandler: app.requireRole(['owner', 'manager', 'attendant']) },
    retryPrintJobHandler,
  );
};
