import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import { env } from './lib/env.js';
import { prismaPlugin } from './plugins/prisma.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
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
  });
  await app.register(sensible);
  await app.register(prismaPlugin);
  await app.register(errorHandlerPlugin);

  await app.register(healthRoutes, { prefix: '/api' });

  return app;
}
