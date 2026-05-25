import { Prisma } from '@cafe/db';
import type { FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';

// Formato padrão de erro do CLAUDE.md:
//   { error: { code: string, message: string, details?: unknown } }

type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

function build(code: string, message: string, details?: unknown): ApiErrorBody {
  return { error: { code, message, ...(details === undefined ? {} : { details }) } };
}

export const errorHandlerPlugin = fp(
  async (app) => {
    app.setNotFoundHandler((_req, reply) => {
      void reply.code(404).send(build('not_found', 'Rota não encontrada'));
    });

    app.setErrorHandler((err, req, reply) => {
      // 1) Validação Zod (manual ou via type provider)
      if (err instanceof ZodError) {
        return reply.code(422).send(build('validation_error', 'Dados inválidos', err.issues));
      }

      // 2) Prisma — erros conhecidos
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          return reply.code(409).send(
            build('conflict', 'Registro duplicado', {
              target: err.meta?.target,
            }),
          );
        }
        if (err.code === 'P2025') {
          return reply.code(404).send(build('not_found', 'Registro não encontrado'));
        }
        if (err.code === 'P2003') {
          return reply.code(409).send(build('fk_violation', 'Referência inválida'));
        }
        req.log.warn({ err }, 'PrismaClientKnownRequestError');
        return reply.code(400).send(build('db_error', err.message, { prismaCode: err.code }));
      }

      // 3) Fastify error com statusCode setado (ex: @fastify/sensible httpErrors)
      const fastifyErr = err as FastifyError;
      const status = fastifyErr.statusCode ?? 500;
      const message = fastifyErr.message ?? (err instanceof Error ? err.message : 'unknown error');

      if (status >= 500) {
        req.log.error({ err }, 'Erro 5xx não tratado');
        return reply
          .code(status)
          .send(
            build(
              'internal_error',
              req.server.config.NODE_ENV === 'production' ? 'Erro interno' : message,
            ),
          );
      }

      // 4xx genérico do Fastify
      return reply
        .code(status)
        .send(build(fastifyErr.code?.toLowerCase() ?? 'bad_request', message));
    });
  },
  { name: 'error-handler' },
);
