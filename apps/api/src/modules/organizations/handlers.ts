import { Prisma } from '@cafe/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { updateDeliverySettingsSchema } from './schemas.js';

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
