import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  type ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';

import { env } from './lib/env.js';
import { cashRegisterRoutes } from './modules/cash-registers/routes.js';
import { categoryRoutes } from './modules/categories/routes.js';
import { customerRoutes } from './modules/customers/routes.js';
import { deliveryFeeRoutes } from './modules/delivery-fees/routes.js';
import { orderRoutes } from './modules/orders/routes.js';
import { organizationRoutes } from './modules/organizations/routes.js';
import { orderPaymentRoutes } from './modules/payments/routes.js';
import { printJobRoutes } from './modules/print-jobs/routes.js';
import { printerDeviceRoutes } from './modules/printer-devices/routes.js';
import { productAddonRoutes } from './modules/product-addons/routes.js';
import { productRoutes } from './modules/products/routes.js';
import { reportRoutes } from './modules/reports/routes.js';
import { tableRoutes } from './modules/tables/routes.js';
import { authPlugin } from './plugins/auth.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { prismaPlugin } from './plugins/prisma.js';
import { realtimePlugin } from './plugins/realtime.js';
import { authRoutes } from './routes/auth.js';
import { healthRoutes } from './routes/health.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: typeof env;
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? {
            level: 'debug',
            transport: {
              target: 'pino-pretty',
              options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
            },
          }
        : { level: 'info' },
    disableRequestLogging: false,
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.decorate('config', env);

  await app.register(helmet, {
    // Em dev relaxa CSP para permitir tools de inspeção; no Passo 10 endurecemos.
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  });
  await app.register(cors, {
    origin: env.NODE_ENV === 'production' ? env.WEB_URL : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await app.register(sensible);
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(realtimePlugin);
  await app.register(errorHandlerPlugin);

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api/v1' });
  await app.register(categoryRoutes, { prefix: '/api/v1/categories' });
  await app.register(productRoutes, { prefix: '/api/v1/products' });
  await app.register(productAddonRoutes, { prefix: '/api/v1/products/:productId/addons' });
  await app.register(tableRoutes, { prefix: '/api/v1/tables' });
  await app.register(customerRoutes, { prefix: '/api/v1/customers' });
  await app.register(deliveryFeeRoutes, { prefix: '/api/v1/delivery-fees' });
  await app.register(organizationRoutes, { prefix: '/api/v1/organization' });
  await app.register(orderRoutes, { prefix: '/api/v1/orders' });
  await app.register(orderPaymentRoutes, { prefix: '/api/v1/orders/:id/payments' });
  await app.register(cashRegisterRoutes, { prefix: '/api/v1/cash-registers' });
  await app.register(printJobRoutes, { prefix: '/api/v1/print-jobs' });
  await app.register(printerDeviceRoutes, { prefix: '/api/v1/printer-devices' });
  await app.register(reportRoutes, { prefix: '/api/v1/reports' });

  return app;
}
