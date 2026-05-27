import { type PlanType, Prisma } from '@cafe/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { env } from '../../lib/env.js';
import {
  listTenantsQuerySchema,
  tenantIdParamSchema,
  updateTenantSchema,
} from './schemas.js';

function error(code: string, message: string) {
  return { error: { code, message } };
}

function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  plan: PlanType;
  planExpiresAt: Date | null;
  suspendedAt: Date | null;
  setupCompletedAt: Date | null;
  createdAt: Date;
  members: { user: { id: string; name: string; email: string } }[];
  _count: { orders: number };
};

function serializeTenant(tenant: TenantRow) {
  const owner = tenant.members[0]?.user ?? null;
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    plan: tenant.plan,
    planExpiresAt: tenant.planExpiresAt?.toISOString() ?? null,
    suspended: tenant.suspendedAt !== null,
    suspendedAt: tenant.suspendedAt?.toISOString() ?? null,
    setupCompleted: tenant.setupCompletedAt !== null,
    createdAt: tenant.createdAt.toISOString(),
    owner: owner
      ? { id: owner.id, name: owner.name, email: owner.email }
      : null,
    ordersTotal: tenant._count.orders,
  };
}

export async function getAdminMetricsHandler(request: FastifyRequest, _reply: FastifyReply) {
  const now = new Date();
  const [tenants, proCount, suspendedCount, ordersTotal, ordersToday] = await Promise.all([
    request.server.prisma.organization.count(),
    request.server.prisma.organization.count({ where: { plan: 'pro' } }),
    request.server.prisma.organization.count({ where: { suspendedAt: { not: null } } }),
    request.server.prisma.order.count(),
    request.server.prisma.order.count({
      where: {
        createdAt: { gte: startOfDayUTC(now), lte: endOfDayUTC(now) },
      },
    }),
  ]);

  const freeCount = tenants - proCount;
  const activeCount = tenants - suspendedCount;
  const mrr = proCount * env.PRO_PLAN_PRICE;

  return {
    data: {
      tenants: {
        total: tenants,
        active: activeCount,
        suspended: suspendedCount,
        free: freeCount,
        pro: proCount,
      },
      orders: {
        total: ordersTotal,
        today: ordersToday,
      },
      mrr: {
        estimated: mrr,
        currency: 'BRL',
        perProPlan: env.PRO_PLAN_PRICE,
      },
    },
  };
}

export async function listTenantsHandler(request: FastifyRequest, _reply: FastifyReply) {
  const query = listTenantsQuerySchema.parse(request.query);
  const where: Prisma.OrganizationWhereInput = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { slug: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.status === 'active') where.suspendedAt = null;
  if (query.status === 'suspended') where.suspendedAt = { not: null };
  if (query.plan !== 'all') where.plan = query.plan;

  const [total, tenants] = await Promise.all([
    request.server.prisma.organization.count({ where }),
    request.server.prisma.organization.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        members: {
          where: { role: 'owner' },
          orderBy: { createdAt: 'asc' },
          take: 1,
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { orders: true } },
      },
    }),
  ]);

  return {
    data: tenants.map(serializeTenant),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function updateTenantHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = tenantIdParamSchema.parse(request.params);
  const body = updateTenantSchema.parse(request.body);

  const tenant = await request.server.prisma.organization.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!tenant) {
    return reply.code(404).send(error('tenant_not_found', 'Tenant não encontrado'));
  }

  const data: Prisma.OrganizationUpdateInput = {};
  if (body.plan !== undefined) data.plan = body.plan;
  if (body.suspended !== undefined) {
    data.suspendedAt = body.suspended ? new Date() : null;
  }
  if (body.planExpiresAt !== undefined) {
    data.planExpiresAt = body.planExpiresAt === null ? null : new Date(body.planExpiresAt);
  }

  const updated = await request.server.prisma.organization.update({
    where: { id },
    data,
    include: {
      members: {
        where: { role: 'owner' },
        orderBy: { createdAt: 'asc' },
        take: 1,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      _count: { select: { orders: true } },
    },
  });

  return reply.code(200).send({ data: serializeTenant(updated) });
}
