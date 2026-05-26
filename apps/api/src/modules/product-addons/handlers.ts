import { Prisma } from '@cafe/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  createProductAddonSchema,
  listProductAddonsQuerySchema,
  productAddonIdParamSchema,
  productAddonProductParamSchema,
  updateProductAddonSchema,
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

type AddonRecord = {
  id: string;
  organizationId: string;
  productId: string;
  name: string;
  price: Prisma.Decimal;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

function serializeAddon(addon: AddonRecord) {
  return {
    id: addon.id,
    organizationId: addon.organizationId,
    productId: addon.productId,
    name: addon.name,
    price: addon.price.toFixed(2),
    available: addon.available,
    createdAt: addon.createdAt.toISOString(),
    updatedAt: addon.updatedAt.toISOString(),
    deletedAt: addon.deletedAt?.toISOString() ?? null,
  };
}

async function ensureProductBelongsToTenant(
  request: FastifyRequest,
  tenantId: string,
  productId: string,
) {
  const product = await request.server.prisma.product.findFirst({
    where: { id: productId, organizationId: tenantId, deletedAt: null },
    select: { id: true },
  });
  return product !== null;
}

export async function listProductAddonsHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { productId } = productAddonProductParamSchema.parse(request.params);
  const query = listProductAddonsQuerySchema.parse(request.query);

  const productOk = await ensureProductBelongsToTenant(request, tenantId, productId);
  if (!productOk) {
    return reply.code(404).send(error('product_not_found', 'Produto não encontrado'));
  }

  const addons = await request.server.prisma.productAddon.findMany({
    where: {
      organizationId: tenantId,
      productId,
      ...(query.available === undefined ? {} : { available: query.available }),
      ...(query.includeDeleted ? {} : { deletedAt: null }),
    },
    orderBy: [{ createdAt: 'asc' }],
  });

  return { data: addons.map(serializeAddon) };
}

export async function createProductAddonHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { productId } = productAddonProductParamSchema.parse(request.params);
  const body = createProductAddonSchema.parse(request.body);

  const productOk = await ensureProductBelongsToTenant(request, tenantId, productId);
  if (!productOk) {
    return reply.code(404).send(error('product_not_found', 'Produto não encontrado'));
  }

  const existing = await request.server.prisma.productAddon.findFirst({
    where: { organizationId: tenantId, productId, name: body.name, deletedAt: null },
    select: { id: true },
  });

  if (existing) {
    return reply.code(409).send(error('addon_already_exists', 'Já existe adicional com esse nome'));
  }

  const addon = await request.server.prisma.productAddon.create({
    data: {
      organizationId: tenantId,
      productId,
      name: body.name,
      price: new Prisma.Decimal(body.price),
      available: body.available ?? true,
    },
  });

  return reply.code(201).send({ data: serializeAddon(addon) });
}

export async function updateProductAddonHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { productId, id } = productAddonIdParamSchema.parse(request.params);
  const body = updateProductAddonSchema.parse(request.body);

  const addon = await request.server.prisma.productAddon.findFirst({
    where: { id, productId, organizationId: tenantId, deletedAt: null },
  });

  if (!addon) {
    return reply.code(404).send(error('addon_not_found', 'Adicional não encontrado'));
  }

  if (body.name !== undefined && body.name !== addon.name) {
    const conflict = await request.server.prisma.productAddon.findFirst({
      where: {
        organizationId: tenantId,
        productId,
        name: body.name,
        deletedAt: null,
        id: { not: id },
      },
      select: { id: true },
    });

    if (conflict) {
      return reply
        .code(409)
        .send(error('addon_already_exists', 'Já existe adicional com esse nome'));
    }
  }

  const updated = await request.server.prisma.productAddon.update({
    where: { id },
    data: {
      ...(body.name === undefined ? {} : { name: body.name }),
      ...(body.price === undefined ? {} : { price: new Prisma.Decimal(body.price) }),
      ...(body.available === undefined ? {} : { available: body.available }),
    },
  });

  return { data: serializeAddon(updated) };
}

export async function deleteProductAddonHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { productId, id } = productAddonIdParamSchema.parse(request.params);

  const addon = await request.server.prisma.productAddon.findFirst({
    where: { id, productId, organizationId: tenantId, deletedAt: null },
    select: { id: true },
  });

  if (!addon) {
    return reply.code(404).send(error('addon_not_found', 'Adicional não encontrado'));
  }

  const deleted = await request.server.prisma.productAddon.update({
    where: { id },
    data: { available: false, deletedAt: new Date() },
  });

  return { data: serializeAddon(deleted) };
}
