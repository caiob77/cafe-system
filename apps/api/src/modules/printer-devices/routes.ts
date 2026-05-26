import type { FastifyPluginAsync } from 'fastify';

import {
  createPrinterDeviceHandler,
  listPrinterDevicesHandler,
  revokePrinterDeviceHandler,
} from './handlers.js';

export const printerDeviceRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.requireRole(['owner', 'manager']) }, listPrinterDevicesHandler);
  app.post('/', { preHandler: app.requireRole(['owner', 'manager']) }, createPrinterDeviceHandler);
  app.delete(
    '/:id',
    { preHandler: app.requireRole(['owner', 'manager']) },
    revokePrinterDeviceHandler,
  );
};
