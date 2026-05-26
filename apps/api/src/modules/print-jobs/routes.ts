import type { FastifyPluginAsync } from 'fastify';

import {
  getPrintJobHandler,
  listPrintJobsHandler,
  retryPrintJobHandler,
  updatePrintJobStatusHandler,
} from './handlers.js';

export const printJobRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/',
    { preHandler: app.requirePrinterOrRole(['owner', 'manager', 'attendant']) },
    listPrintJobsHandler,
  );
  app.get(
    '/:id',
    { preHandler: app.requirePrinterOrRole(['owner', 'manager', 'attendant']) },
    getPrintJobHandler,
  );
  app.patch(
    '/:id/status',
    { preHandler: app.requirePrinterOrRole(['owner', 'manager', 'attendant']) },
    updatePrintJobStatusHandler,
  );
  app.post(
    '/:id/retry',
    { preHandler: app.requireRole(['owner', 'manager', 'attendant']) },
    retryPrintJobHandler,
  );
};
