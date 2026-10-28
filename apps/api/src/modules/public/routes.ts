import type { FastifyPluginAsync } from 'fastify';

import {
  createPublicOrderHandler,
  getPublicDeliverySettingsHandler,
  getPublicMenuHandler,
} from './handlers.js';

export const publicRoutes: FastifyPluginAsync = async (app) => {
  app.get('/:slug/menu', getPublicMenuHandler);
  app.get('/:slug/delivery-settings', getPublicDeliverySettingsHandler);
  app.post('/:slug/orders', createPublicOrderHandler);
};
