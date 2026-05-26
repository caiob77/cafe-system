import { Prisma } from '@cafe/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  createDeliveryFeeSchema,
  deliveryFeeIdParamSchema,
  updateDeliveryFeeSchema,
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

type DeliveryFeeRecord = Prisma.DeliveryNeighborhoodFeeGetPayload<true>;

function serializeDeliveryFee(fee: DeliveryFeeRecord) {
  return {
    id: fee.id,
    organizationId: fee.organizationId,
    neighborhood: fee.neighborhood,
    fee: fee.fee.toFixed(2),
    createdAt: fee.createdAt.toISOString(),
    updatedAt: fee.updatedAt.toISOString(),
  };
}

export async function listDeliveryFeesHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const fees = await request.server.prisma.deliveryNeighborhoodFee.findMany({
    where: { organizationId: tenantId },
    orderBy: { neighborhood: 'asc' },
  });

  return { data: fees.map(serializeDeliveryFee) };
}

export async function createDeliveryFeeHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const body = createDeliveryFeeSchema.parse(request.body);

  const duplicate = await request.server.prisma.deliveryNeighborhoodFee.findFirst({
    where: {
      organizationId: tenantId,
      neighborhood: { equals: body.neighborhood, mode: 'insensitive' },
    },
  });
  if (duplicate) {
    return reply.code(409).send({
      error: {
        code: 'delivery_fee_neighborhood_taken',
        message: `Já existe taxa para o bairro "${duplicate.neighborhood}"`,
      },
      data: serializeDeliveryFee(duplicate),
    });
  }

  try {
    const fee = await request.server.prisma.deliveryNeighborhoodFee.create({
      data: {
        organizationId: tenantId,
        neighborhood: body.neighborhood,
        fee: new Prisma.Decimal(body.fee),
      },
    });
    return reply.code(201).send({ data: serializeDeliveryFee(fee) });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return reply.code(409).send(error('delivery_fee_neighborhood_taken', 'Bairro já cadastrado'));
    }
    throw err;
  }
}

export async function updateDeliveryFeeHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = deliveryFeeIdParamSchema.parse(request.params);
  const body = updateDeliveryFeeSchema.parse(request.body);

  const existing = await request.server.prisma.deliveryNeighborhoodFee.findFirst({
    where: { id, organizationId: tenantId },
  });
  if (!existing) {
    return reply.code(404).send(error('delivery_fee_not_found', 'Taxa de bairro não encontrada'));
  }

  if (
    body.neighborhood &&
    body.neighborhood.toLowerCase() !== existing.neighborhood.toLowerCase()
  ) {
    const conflict = await request.server.prisma.deliveryNeighborhoodFee.findFirst({
      where: {
        organizationId: tenantId,
        neighborhood: { equals: body.neighborhood, mode: 'insensitive' },
        id: { not: id },
      },
    });
    if (conflict) {
      return reply.code(409).send({
        error: {
          code: 'delivery_fee_neighborhood_taken',
          message: `Já existe taxa para o bairro "${conflict.neighborhood}"`,
        },
        data: serializeDeliveryFee(conflict),
      });
    }
  }

  try {
    const updated = await request.server.prisma.deliveryNeighborhoodFee.update({
      where: { id },
      data: {
        ...(body.neighborhood === undefined ? {} : { neighborhood: body.neighborhood }),
        ...(body.fee === undefined ? {} : { fee: new Prisma.Decimal(body.fee) }),
      },
    });
    return { data: serializeDeliveryFee(updated) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return reply.code(409).send(error('delivery_fee_neighborhood_taken', 'Bairro já cadastrado'));
    }
    throw err;
  }
}

export async function deleteDeliveryFeeHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = deliveryFeeIdParamSchema.parse(request.params);

  const existing = await request.server.prisma.deliveryNeighborhoodFee.findFirst({
    where: { id, organizationId: tenantId },
  });
  if (!existing) {
    return reply.code(404).send(error('delivery_fee_not_found', 'Taxa de bairro não encontrada'));
  }

  const deleted = await request.server.prisma.deliveryNeighborhoodFee.delete({
    where: { id },
  });
  return { data: serializeDeliveryFee(deleted) };
}
