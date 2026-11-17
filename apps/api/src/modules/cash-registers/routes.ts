import type { FastifyPluginAsync } from 'fastify';

import {
  closeCashRegisterHandler,
  createCashMovementHandler,
  getCashRegisterHandler,
  getCurrentCashRegisterHandler,
  openCashRegisterHandler,
} from './handlers.js';

export const cashRegisterRoutes: FastifyPluginAsync = async (app) => {
  const roles = ['owner', 'manager'] as const;

  app.get('/current', { preHandler: app.requireRole([...roles]) }, getCurrentCashRegisterHandler);

  app.post('/open', { preHandler: app.requireRole([...roles]) }, openCashRegisterHandler);

  app.post('/close', { preHandler: app.requireRole([...roles]) }, closeCashRegisterHandler);

  app.get('/:id', { preHandler: app.requireRole([...roles]) }, getCashRegisterHandler);

  app.post(
    '/:id/movements',
    { preHandler: app.requireRole([...roles]) },
    createCashMovementHandler,
  );
};
