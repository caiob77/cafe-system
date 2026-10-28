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

  const fees = await request.withTenant((db) =>
    db.deliveryNeighborhoodFee.findMany({
      orderBy: { neighborhood: 'asc' },
    }),
  );

  return { data: fees.map(serializeDeliveryFee) };
}

export async function createDeliveryFeeHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const body = createDeliveryFeeSchema.parse(request.body);

  const duplicate = await request.withTenant((db) =>
    db.deliveryNeighborhoodFee.findFirst({
      where: {
        neighborhood: { equals: body.neighborhood, mode: 'insensitive' },
      },
    }),
  );
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
    const fee = await request.withTenant((db) =>
      db.deliveryNeighborhoodFee.create({
        data: {
          organizationId: tenantId,
          neighborhood: body.neighborhood,
          fee: new Prisma.Decimal(body.fee),
        },
      }),
    );
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

  try {
    const result = await request.withTenant(async (db) => {
      const existing = await db.deliveryNeighborhoodFee.findFirst({
        where: { id },
      });
      if (!existing) return { kind: 'not_found' as const };

      if (
        body.neighborhood &&
        body.neighborhood.toLowerCase() !== existing.neighborhood.toLowerCase()
      ) {
        const conflict = await db.deliveryNeighborhoodFee.findFirst({
          where: {
            neighborhood: { equals: body.neighborhood, mode: 'insensitive' },
            id: { not: id },
          },
        });
        if (conflict) return { kind: 'duplicate' as const, conflict };
      }

      const updated = await db.deliveryNeighborhoodFee.update({
        where: { id },
        data: {
          ...(body.neighborhood === undefined ? {} : { neighborhood: body.neighborhood }),
          ...(body.fee === undefined ? {} : { fee: new Prisma.Decimal(body.fee) }),
        },
      });
      return { kind: 'ok' as const, updated };
    });

    if (result.kind === 'not_found') {
      return reply.code(404).send(error('delivery_fee_not_found', 'Taxa de bairro não encontrada'));
    }
    if (result.kind === 'duplicate') {
      return reply.code(409).send({
        error: {
          code: 'delivery_fee_neighborhood_taken',
          message: `Já existe taxa para o bairro "${result.conflict.neighborhood}"`,
        },
        data: serializeDeliveryFee(result.conflict),
      });
    }
    return { data: serializeDeliveryFee(result.updated) };
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

  const result = await request.withTenant(async (db) => {
    const existing = await db.deliveryNeighborhoodFee.findFirst({
      where: { id },
    });
    if (!existing) return { kind: 'not_found' as const };

    const deleted = await db.deliveryNeighborhoodFee.delete({
      where: { id },
    });
    return { kind: 'ok' as const, deleted };
  });
  if (result.kind === 'not_found') {
    return reply.code(404).send(error('delivery_fee_not_found', 'Taxa de bairro não encontrada'));
  }
  return { data: serializeDeliveryFee(result.deleted) };
}
