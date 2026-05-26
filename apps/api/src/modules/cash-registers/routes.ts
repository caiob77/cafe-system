import type { FastifyPluginAsync } from 'fastify';

import {
  closeCashRegisterHandler,
  createCashMovementHandler,
  getCashRegisterHandler,
  getCurrentCashRegisterHandler,
  openCashRegisterHandler,
} from './handlers.js';

export const cashRegisterRoutes: FastifyPluginAsync = async (app) => {
  app.get('/current', { preHandler: app.requireAuth }, getCurrentCashRegisterHandler);

  app.post(
    '/open',
    { preHandler: app.requireRole(['owner', 'manager', 'attendant']) },
    openCashRegisterHandler,
  );

  app.post(
    '/close',
    { preHandler: app.requireRole(['owner', 'manager', 'attendant']) },
    closeCashRegisterHandler,
  );

  app.get('/:id', { preHandler: app.requireAuth }, getCashRegisterHandler);

  app.post(
    '/:id/movements',
    { preHandler: app.requireRole(['owner', 'manager', 'attendant']) },
    createCashMovementHandler,
  );
};
