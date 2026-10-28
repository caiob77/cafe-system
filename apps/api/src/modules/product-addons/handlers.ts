import { Prisma, type TenantTx } from '@cafe/db';
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

async function ensureProductBelongsToTenant(db: TenantTx, productId: string) {
  const product = await db.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true },
  });
  return product !== null;
}

export async function listProductAddonsHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { productId } = productAddonProductParamSchema.parse(request.params);
  const query = listProductAddonsQuerySchema.parse(request.query);

  const result = await request.withTenant(async (db) => {
    const productOk = await ensureProductBelongsToTenant(db, productId);
    if (!productOk) return { kind: 'product_not_found' as const };

    const addons = await db.productAddon.findMany({
      where: {
        productId,
        ...(query.available === undefined ? {} : { available: query.available }),
        ...(query.includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    return { kind: 'ok' as const, addons };
  });

  if (result.kind === 'product_not_found') {
    return reply.code(404).send(error('product_not_found', 'Produto não encontrado'));
  }

  return { data: result.addons.map(serializeAddon) };
}

export async function createProductAddonHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { productId } = productAddonProductParamSchema.parse(request.params);
  const body = createProductAddonSchema.parse(request.body);

  const result = await request.withTenant(async (db) => {
    const productOk = await ensureProductBelongsToTenant(db, productId);
    if (!productOk) return { kind: 'product_not_found' as const };

    const existing = await db.productAddon.findFirst({
      where: { productId, name: body.name, deletedAt: null },
      select: { id: true },
    });

    if (existing) return { kind: 'duplicate' as const };

    const addon = await db.productAddon.create({
      data: {
        organizationId: tenantId,
        productId,
        name: body.name,
        price: new Prisma.Decimal(body.price),
        available: body.available ?? true,
      },
    });

    return { kind: 'ok' as const, addon };
  });

  if (result.kind === 'product_not_found') {
    return reply.code(404).send(error('product_not_found', 'Produto não encontrado'));
  }
  if (result.kind === 'duplicate') {
    return reply.code(409).send(error('addon_already_exists', 'Já existe adicional com esse nome'));
  }

  return reply.code(201).send({ data: serializeAddon(result.addon) });
}

export async function updateProductAddonHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { productId, id } = productAddonIdParamSchema.parse(request.params);
  const body = updateProductAddonSchema.parse(request.body);

  const result = await request.withTenant(async (db) => {
    const addon = await db.productAddon.findFirst({
      where: { id, productId, deletedAt: null },
    });

    if (!addon) return { kind: 'not_found' as const };

    if (body.name !== undefined && body.name !== addon.name) {
      const conflict = await db.productAddon.findFirst({
        where: {
          productId,
          name: body.name,
          deletedAt: null,
          id: { not: id },
        },
        select: { id: true },
      });

      if (conflict) return { kind: 'duplicate' as const };
    }

    const updated = await db.productAddon.update({
      where: { id },
      data: {
        ...(body.name === undefined ? {} : { name: body.name }),
        ...(body.price === undefined ? {} : { price: new Prisma.Decimal(body.price) }),
        ...(body.available === undefined ? {} : { available: body.available }),
      },
    });

    return { kind: 'ok' as const, updated };
  });

  if (result.kind === 'not_found') {
    return reply.code(404).send(error('addon_not_found', 'Adicional não encontrado'));
  }
  if (result.kind === 'duplicate') {
    return reply.code(409).send(error('addon_already_exists', 'Já existe adicional com esse nome'));
  }

  return { data: serializeAddon(result.updated) };
}

export async function deleteProductAddonHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { productId, id } = productAddonIdParamSchema.parse(request.params);

  const result = await request.withTenant(async (db) => {
    const addon = await db.productAddon.findFirst({
      where: { id, productId, deletedAt: null },
      select: { id: true },
    });

    if (!addon) return { kind: 'not_found' as const };

    const deleted = await db.productAddon.update({
      where: { id },
      data: { available: false, deletedAt: new Date() },
    });

    return { kind: 'ok' as const, deleted };
  });

  if (result.kind === 'not_found') {
    return reply.code(404).send(error('addon_not_found', 'Adicional não encontrado'));
  }

  return { data: serializeAddon(result.deleted) };
}
