import type { FastifyPluginAsync } from 'fastify';

import { createUploadSignatureHandler } from './handlers.js';

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/signature',
    { preHandler: app.requireRole(['owner', 'manager']) },
    createUploadSignatureHandler,
  );
};
