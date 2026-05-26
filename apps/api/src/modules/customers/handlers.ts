import { Prisma } from '@cafe/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  createCustomerSchema,
  customerIdParamSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
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

type CustomerRecord = Prisma.CustomerGetPayload<true>;

function serializeCustomer(customer: CustomerRecord) {
  return {
    id: customer.id,
    organizationId: customer.organizationId,
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    neighborhood: customer.neighborhood,
    reference: customer.reference,
    notes: customer.notes,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    deletedAt: customer.deletedAt?.toISOString() ?? null,
  };
}

export async function listCustomersHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const query = listCustomersQuerySchema.parse(request.query);

  const searchFilter: Prisma.CustomerWhereInput = query.search
    ? {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search } },
        ],
      }
    : {};

  const customers = await request.server.prisma.customer.findMany({
    where: {
      organizationId: tenantId,
      deletedAt: null,
      ...searchFilter,
    },
    orderBy: { name: 'asc' },
    take: query.limit ?? 100,
  });

  return { data: customers.map(serializeCustomer) };
}

export async function createCustomerHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const body = createCustomerSchema.parse(request.body);

  try {
    const customer = await request.server.prisma.customer.create({
      data: {
        organizationId: tenantId,
        name: body.name,
        phone: body.phone,
        address: body.address ?? null,
        neighborhood: body.neighborhood ?? null,
        reference: body.reference ?? null,
        notes: body.notes ?? null,
      },
    });

    return reply.code(201).send({ data: serializeCustomer(customer) });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const conflict = await request.server.prisma.customer.findFirst({
        where: { organizationId: tenantId, phone: body.phone },
      });
      return reply.code(409).send({
        error: {
          code: 'customer_phone_taken',
          message: 'Já existe cliente com esse telefone',
        },
        ...(conflict ? { data: serializeCustomer(conflict) } : {}),
      });
    }
    throw err;
  }
}

export async function getCustomerHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = customerIdParamSchema.parse(request.params);

  const customer = await request.server.prisma.customer.findFirst({
    where: { id, organizationId: tenantId, deletedAt: null },
  });

  if (!customer) {
    return reply.code(404).send(error('customer_not_found', 'Cliente não encontrado'));
  }

  return { data: serializeCustomer(customer) };
}

export async function updateCustomerHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = customerIdParamSchema.parse(request.params);
  const body = updateCustomerSchema.parse(request.body);

  const existing = await request.server.prisma.customer.findFirst({
    where: { id, organizationId: tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return reply.code(404).send(error('customer_not_found', 'Cliente não encontrado'));
  }

  try {
    const updated = await request.server.prisma.customer.update({
      where: { id },
      data: {
        ...(body.name === undefined ? {} : { name: body.name }),
        ...(body.phone === undefined ? {} : { phone: body.phone }),
        ...(body.address === undefined ? {} : { address: body.address }),
        ...(body.neighborhood === undefined ? {} : { neighborhood: body.neighborhood }),
        ...(body.reference === undefined ? {} : { reference: body.reference }),
        ...(body.notes === undefined ? {} : { notes: body.notes }),
      },
    });

    return { data: serializeCustomer(updated) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return reply
        .code(409)
        .send(error('customer_phone_taken', 'Já existe cliente com esse telefone'));
    }
    throw err;
  }
}

export async function deleteCustomerHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = customerIdParamSchema.parse(request.params);

  const existing = await request.server.prisma.customer.findFirst({
    where: { id, organizationId: tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return reply.code(404).send(error('customer_not_found', 'Cliente não encontrado'));
  }

  const hasActive = await request.server.prisma.order.findFirst({
    where: {
      organizationId: tenantId,
      customerId: id,
      status: { in: ['pending', 'preparing', 'ready', 'out_for_delivery', 'delivered'] },
    },
    select: { id: true },
  });
  if (hasActive) {
    return reply
      .code(409)
      .send(error('customer_has_active_order', 'Cliente possui pedido em aberto'));
  }

  const deleted = await request.server.prisma.customer.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return { data: serializeCustomer(deleted) };
}
