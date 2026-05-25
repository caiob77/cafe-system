import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import fp from 'fastify-plugin';

import { type AppRole, type AuthSession, auth } from '../lib/auth.js';

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: preHandlerHookHandler;
    requireRole: (roles: AppRole | AppRole[]) => preHandlerHookHandler;
  }

  interface FastifyRequest {
    authSession: AuthSession | null;
    tenantId: string | null;
    role: AppRole | null;
  }
}

function error(code: string, message: string) {
  return { error: { code, message } };
}

function isAppRole(role: string): role is AppRole {
  return ['owner', 'manager', 'attendant', 'kitchen'].includes(role);
}

function isAuthRoute(request: FastifyRequest): boolean {
  return request.url.startsWith('/api/auth/');
}

function activeOrganizationId(session: AuthSession): string | undefined {
  return (
    (session.session as { activeOrganizationId?: string | null }).activeOrganizationId ?? undefined
  );
}

async function setRequestAuthContext(request: FastifyRequest): Promise<void> {
  request.authSession = null;
  request.tenantId = null;
  request.role = null;

  if (isAuthRoute(request)) return;

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  if (!session) return;

  request.authSession = session;

  const activeOrgId = activeOrganizationId(session);
  const member = await request.server.prisma.member.findFirst({
    where: {
      userId: session.user.id,
      ...(activeOrgId ? { organizationId: activeOrgId } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!member || !isAppRole(member.role)) return;

  request.tenantId = member.organizationId;
  request.role = member.role;
}

export const authPlugin = fp(
  async (app) => {
    app.decorateRequest('authSession', null);
    app.decorateRequest('tenantId', null);
    app.decorateRequest('role', null);

    app.decorate('requireAuth', async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.authSession) {
        return reply.code(401).send(error('unauthorized', 'Sessão obrigatória'));
      }
    });

    app.decorate('requireRole', (roles: AppRole | AppRole[]) => {
      const allowed = Array.isArray(roles) ? roles : [roles];

      return async (request, reply) => {
        if (!request.authSession) {
          return reply.code(401).send(error('unauthorized', 'Sessão obrigatória'));
        }

        if (!request.role || !allowed.includes(request.role)) {
          return reply.code(403).send(error('forbidden', 'Permissão insuficiente'));
        }
      };
    });

    app.addHook('onRequest', setRequestAuthContext);

    app.route({
      method: ['GET', 'POST'],
      url: '/api/auth/*',
      async handler(request, reply) {
        try {
          const url = new URL(request.url, `http://${request.headers.host}`);
          const headers = fromNodeHeaders(request.headers);
          const body = request.body === undefined ? undefined : JSON.stringify(request.body);

          const response = await auth.handler(
            new Request(url.toString(), {
              method: request.method,
              headers,
              body,
            }),
          );

          reply.status(response.status);
          response.headers.forEach((value, key) => reply.header(key, value));

          const text = await response.text();
          return reply.send(text.length > 0 ? text : null);
        } catch (err) {
          request.log.error({ err }, 'Better Auth handler falhou');
          return reply.code(500).send(error('auth_failure', 'Erro interno de autenticação'));
        }
      },
    });
  },
  {
    name: 'auth',
    dependencies: ['prisma'],
  },
);
