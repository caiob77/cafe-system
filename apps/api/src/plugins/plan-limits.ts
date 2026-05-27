import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import fp from 'fastify-plugin';

import { auth } from '../lib/auth.js';
import { PLAN_LIMITS, checkMemberLimit } from '../lib/plan-limits.js';

declare module 'fastify' {
  interface FastifyInstance {
    requireAdvancedReports: preHandlerHookHandler;
  }
}

function error(code: string, message: string) {
  return { error: { code, message } };
}

const MEMBER_INVITE_URLS = [
  '/api/auth/organization/invite-member',
  '/api/auth/organization/add-member',
];

export const planLimitsPlugin = fp(
  async (app) => {
    app.decorate(
      'requireAdvancedReports',
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.tenantId) {
          return reply
            .code(403)
            .send(error('tenant_required', 'Organização ativa obrigatória'));
        }

        const org = await request.server.prisma.organization.findUnique({
          where: { id: request.tenantId },
          select: { plan: true },
        });

        if (!org) {
          return reply
            .code(404)
            .send(error('organization_not_found', 'Organização não encontrada'));
        }

        if (!PLAN_LIMITS[org.plan].advancedReports) {
          return reply.code(402).send(
            error(
              'plan_limit_reached',
              `Relatórios avançados não disponíveis no plano ${org.plan}. Faça upgrade para o Pro.`,
            ),
          );
        }
      },
    );

    app.addHook('preHandler', async (request, reply) => {
      if (request.method !== 'POST') return;
      const url = request.url.split('?')[0];
      if (!MEMBER_INVITE_URLS.some((path) => url === path)) return;

      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });
      if (!session) return;

      const activeOrgId =
        (session.session as { activeOrganizationId?: string | null }).activeOrganizationId ?? null;
      if (!activeOrgId) return;

      const org = await request.server.prisma.organization.findUnique({
        where: { id: activeOrgId },
        select: { plan: true },
      });
      if (!org) return;

      const members = await request.server.prisma.member.count({
        where: { organizationId: activeOrgId },
      });
      const limit = checkMemberLimit(org.plan, members);
      if (!limit.ok) {
        return reply.code(402).send(error(limit.code, limit.message));
      }
    });
  },
  {
    name: 'plan-limits',
    dependencies: ['prisma', 'auth'],
  },
);
