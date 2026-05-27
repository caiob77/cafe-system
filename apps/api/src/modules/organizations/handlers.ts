import { type PlanType, Prisma } from '@cafe/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { PLAN_LIMITS, getPlanUsage } from '../../lib/plan-limits.js';
import { generatePrinterToken, hashPrinterToken } from '../../lib/printer-token.js';
import {
  completeSetupSchema,
  updateDeliverySettingsSchema,
  updateOrganizationProfileSchema,
} from './schemas.js';

function error(code: string, message: string) {
  return { error: { code, message } };
}

function tenantIdOrReply(request: FastifyRequest, reply: FastifyReply) {
  if (!request.tenantId) {
    void reply.code(403).send(error('tenant_required', 'Organização ativa obrigatória'));
    return null;
  }
  return request.tenantId;
}

function serializeDeliverySettings(org: {
  id: string;
  deliveryEnabled: boolean;
  deliverySchedule: Prisma.JsonValue | null;
  defaultDeliveryFee: Prisma.Decimal | null;
}) {
  return {
    organizationId: org.id,
    deliveryEnabled: org.deliveryEnabled,
    deliverySchedule: org.deliverySchedule,
    defaultDeliveryFee: org.defaultDeliveryFee?.toFixed(2) ?? null,
  };
}

function serializeOrganization(org: {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  addressLine: string | null;
  phone: string | null;
  deliveryEnabled: boolean;
  deliverySchedule: Prisma.JsonValue | null;
  defaultDeliveryFee: Prisma.Decimal | null;
  setupCompletedAt: Date | null;
  plan: PlanType;
  planExpiresAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo: org.logo,
    addressLine: org.addressLine,
    phone: org.phone,
    deliveryEnabled: org.deliveryEnabled,
    deliverySchedule: org.deliverySchedule,
    defaultDeliveryFee: org.defaultDeliveryFee?.toFixed(2) ?? null,
    setupCompletedAt: org.setupCompletedAt?.toISOString() ?? null,
    setupCompleted: org.setupCompletedAt !== null,
    plan: org.plan,
    planExpiresAt: org.planExpiresAt?.toISOString() ?? null,
    createdAt: org.createdAt.toISOString(),
  };
}

const ORG_SELECT = {
  id: true,
  name: true,
  slug: true,
  logo: true,
  addressLine: true,
  phone: true,
  deliveryEnabled: true,
  deliverySchedule: true,
  defaultDeliveryFee: true,
  setupCompletedAt: true,
  plan: true,
  planExpiresAt: true,
  createdAt: true,
} as const;

export async function getMeHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const org = await request.server.prisma.organization.findUnique({
    where: { id: tenantId },
    select: ORG_SELECT,
  });

  if (!org) {
    return reply.code(404).send(error('organization_not_found', 'Organização não encontrada'));
  }

  return { data: serializeOrganization(org) };
}

export async function updateProfileHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const body = updateOrganizationProfileSchema.parse(request.body);
  const data: Prisma.OrganizationUpdateInput = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.logo !== undefined) data.logo = body.logo;
  if (body.addressLine !== undefined) data.addressLine = body.addressLine;
  if (body.phone !== undefined) data.phone = body.phone;

  const updated = await request.server.prisma.organization.update({
    where: { id: tenantId },
    data,
    select: ORG_SELECT,
  });

  return { data: serializeOrganization(updated) };
}

export async function completeSetupHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const org = await request.server.prisma.organization.findUnique({
    where: { id: tenantId },
    select: { id: true, setupCompletedAt: true },
  });

  if (!org) {
    return reply.code(404).send(error('organization_not_found', 'Organização não encontrada'));
  }

  if (org.setupCompletedAt) {
    return reply.code(409).send(error('setup_already_completed', 'Setup já concluído'));
  }

  const body = completeSetupSchema.parse(request.body);

  const orgUpdate: Prisma.OrganizationUpdateInput = {
    setupCompletedAt: new Date(),
  };

  if (body?.addressLine !== undefined) orgUpdate.addressLine = body.addressLine;
  if (body?.phone !== undefined) orgUpdate.phone = body.phone;
  if (body?.deliveryEnabled !== undefined) orgUpdate.deliveryEnabled = body.deliveryEnabled;
  if (body?.deliverySchedule !== undefined) {
    orgUpdate.deliverySchedule =
      body.deliverySchedule === null ? Prisma.JsonNull : body.deliverySchedule;
  }
  if (body?.defaultDeliveryFee !== undefined) {
    orgUpdate.defaultDeliveryFee =
      body.defaultDeliveryFee === null ? null : new Prisma.Decimal(body.defaultDeliveryFee);
  }

  const tableCount = body?.tableCount ?? 0;
  const deliveryFees = body?.deliveryFees ?? [];
  const printer = body?.printer ?? null;
  const printerToken = printer ? generatePrinterToken() : null;

  const result = await request.server.prisma.$transaction(async (tx) => {
    const updated = await tx.organization.update({
      where: { id: tenantId },
      data: orgUpdate,
      select: ORG_SELECT,
    });

    if (tableCount > 0) {
      await tx.table.createMany({
        data: Array.from({ length: tableCount }, (_, index) => ({
          organizationId: tenantId,
          number: index + 1,
          capacity: 4,
        })),
      });
    }

    if (deliveryFees.length > 0) {
      await tx.deliveryNeighborhoodFee.createMany({
        data: deliveryFees.map((fee) => ({
          organizationId: tenantId,
          neighborhood: fee.neighborhood,
          fee: new Prisma.Decimal(fee.fee),
        })),
      });
    }

    let createdPrinterId: string | null = null;
    if (printer && printerToken) {
      const created = await tx.printerDevice.create({
        data: {
          organizationId: tenantId,
          name: printer.name,
          tokenHash: hashPrinterToken(printerToken),
        },
        select: { id: true },
      });
      createdPrinterId = created.id;
    }

    return { updated, createdPrinterId };
  });

  return reply.code(200).send({
    data: {
      ...serializeOrganization(result.updated),
      printer:
        result.createdPrinterId && printerToken
          ? { id: result.createdPrinterId, name: printer?.name, token: printerToken }
          : null,
    },
  });
}

export async function getDeliverySettingsHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const org = await request.server.prisma.organization.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      deliveryEnabled: true,
      deliverySchedule: true,
      defaultDeliveryFee: true,
    },
  });

  if (!org) {
    return reply.code(404).send(error('organization_not_found', 'Organização não encontrada'));
  }

  return { data: serializeDeliverySettings(org) };
}

export async function updateDeliverySettingsHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const body = updateDeliverySettingsSchema.parse(request.body);
  const data: Prisma.OrganizationUpdateInput = {};

  if (body.deliveryEnabled !== undefined) {
    data.deliveryEnabled = body.deliveryEnabled;
  }
  if (body.deliverySchedule !== undefined) {
    data.deliverySchedule =
      body.deliverySchedule === null ? Prisma.JsonNull : body.deliverySchedule;
  }
  if (body.defaultDeliveryFee !== undefined) {
    data.defaultDeliveryFee =
      body.defaultDeliveryFee === null ? null : new Prisma.Decimal(body.defaultDeliveryFee);
  }

  const updated = await request.server.prisma.organization.update({
    where: { id: tenantId },
    data,
    select: {
      id: true,
      deliveryEnabled: true,
      deliverySchedule: true,
      defaultDeliveryFee: true,
    },
  });

  return { data: serializeDeliverySettings(updated) };
}

export async function getPlanHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const org = await request.server.prisma.organization.findUnique({
    where: { id: tenantId },
    select: { id: true, plan: true, planExpiresAt: true },
  });

  if (!org) {
    return reply.code(404).send(error('organization_not_found', 'Organização não encontrada'));
  }

  const usage = await getPlanUsage(request.server.prisma, tenantId);
  const limits = PLAN_LIMITS[org.plan];

  return {
    data: {
      plan: org.plan,
      planExpiresAt: org.planExpiresAt?.toISOString() ?? null,
      limits: {
        dailyOrders: limits.dailyOrders,
        members: limits.members,
        advancedReports: limits.advancedReports,
      },
      usage: {
        ordersToday: usage.ordersToday,
        members: usage.members,
      },
    },
  };
}


