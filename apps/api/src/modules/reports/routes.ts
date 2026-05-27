import type { FastifyPluginAsync } from 'fastify';

import {
  paymentsReportHandler,
  productsReportHandler,
  salesReportHandler,
  summaryReportHandler,
} from './handlers.js';

export const reportRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/sales',
    { preHandler: [app.requireRole(['owner', 'manager']), app.requireAdvancedReports] },
    salesReportHandler,
  );
  app.get(
    '/products',
    { preHandler: [app.requireRole(['owner', 'manager']), app.requireAdvancedReports] },
    productsReportHandler,
  );
  app.get(
    '/payments',
    { preHandler: [app.requireRole(['owner', 'manager']), app.requireAdvancedReports] },
    paymentsReportHandler,
  );
  app.get('/summary', { preHandler: app.requireRole(['owner', 'manager']) }, summaryReportHandler);
};
