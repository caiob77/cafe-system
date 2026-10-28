import { Prisma, type TenantTx } from '@cafe/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  updateProductAvailabilitySchema,
  updateProductSchema,
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

type ProductRecord = {
  id: string;
  organizationId: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: Prisma.Decimal;
  imageUrl: string | null;
  imagePublicId: string | null;
  available: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

function serializeProduct(product: ProductRecord) {
  return {
    id: product.id,
    organizationId: product.organizationId,
    categoryId: product.categoryId,
    name: product.name,
    description: product.description,
    price: product.price.toFixed(2),
    imageUrl: product.imageUrl,
    imagePublicId: product.imagePublicId,
    available: product.available,
    sortOrder: product.sortOrder,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    deletedAt: product.deletedAt?.toISOString() ?? null,
  };
}

async function ensureCategoryBelongsToTenant(db: TenantTx, categoryId: string) {
  const category = await db.category.findFirst({
    where: { id: categoryId, deletedAt: null },
    select: { id: true },
  });
  return category !== null;
}

export async function listProductsHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const query = listProductsQuerySchema.parse(request.query);

  const products = await request.withTenant((db) =>
    db.product.findMany({
      where: {
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.available === undefined ? {} : { available: query.available }),
        ...(query.includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    }),
  );

  return { data: products.map(serializeProduct) };
}

export async function getProductHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = productIdParamSchema.parse(request.params);

  const product = await request.withTenant((db) =>
    db.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        addons: {
          where: { deletedAt: null },
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    }),
  );

  if (!product) {
    return reply.code(404).send(error('product_not_found', 'Produto não encontrado'));
  }

  return {
    data: {
      ...serializeProduct(product),
      addons: product.addons.map((addon) => ({
        id: addon.id,
        organizationId: addon.organizationId,
        productId: addon.productId,
        name: addon.name,
        price: addon.price.toFixed(2),
        available: addon.available,
        createdAt: addon.createdAt.toISOString(),
        updatedAt: addon.updatedAt.toISOString(),
        deletedAt: addon.deletedAt?.toISOString() ?? null,
      })),
    },
  };
}

export async function createProductHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const body = createProductSchema.parse(request.body);

  const result = await request.withTenant(async (db) => {
    const categoryOk = await ensureCategoryBelongsToTenant(db, body.categoryId);
    if (!categoryOk) return { kind: 'category_not_found' as const };

    const existing = await db.product.findFirst({
      where: {
        categoryId: body.categoryId,
        name: body.name,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existing) return { kind: 'duplicate' as const };

    const maxSort = await db.product.aggregate({
      where: { categoryId: body.categoryId, deletedAt: null },
      _max: { sortOrder: true },
    });

    const product = await db.product.create({
      data: {
        organizationId: tenantId,
        categoryId: body.categoryId,
        name: body.name,
        description: body.description ?? null,
        price: new Prisma.Decimal(body.price),
        imageUrl: body.imageUrl ?? null,
        imagePublicId: body.imagePublicId ?? null,
        available: body.available ?? true,
        sortOrder: body.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    return { kind: 'ok' as const, product };
  });

  if (result.kind === 'category_not_found') {
    return reply.code(404).send(error('category_not_found', 'Categoria não encontrada'));
  }
  if (result.kind === 'duplicate') {
    return reply
      .code(409)
      .send(error('product_already_exists', 'Já existe produto com esse nome na categoria'));
  }

  return reply.code(201).send({ data: serializeProduct(result.product) });
}

export async function updateProductHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = productIdParamSchema.parse(request.params);
  const body = updateProductSchema.parse(request.body);

  const result = await request.withTenant(async (db) => {
    const product = await db.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!product) return { kind: 'not_found' as const };

    if (body.categoryId && body.categoryId !== product.categoryId) {
      const categoryOk = await ensureCategoryBelongsToTenant(db, body.categoryId);
      if (!categoryOk) return { kind: 'category_not_found' as const };
    }

    const targetCategoryId = body.categoryId ?? product.categoryId;
    const targetName = body.name ?? product.name;

    if (body.name !== undefined || body.categoryId !== undefined) {
      const conflict = await db.product.findFirst({
        where: {
          categoryId: targetCategoryId,
          name: targetName,
          deletedAt: null,
          id: { not: id },
        },
        select: { id: true },
      });

      if (conflict) return { kind: 'duplicate' as const };
    }

    const updated = await db.product.update({
      where: { id },
      data: {
        ...(body.categoryId === undefined ? {} : { categoryId: body.categoryId }),
        ...(body.name === undefined ? {} : { name: body.name }),
        ...(body.description === undefined ? {} : { description: body.description ?? null }),
        ...(body.price === undefined ? {} : { price: new Prisma.Decimal(body.price) }),
        ...(body.imageUrl === undefined ? {} : { imageUrl: body.imageUrl ?? null }),
        ...(body.imagePublicId === undefined ? {} : { imagePublicId: body.imagePublicId ?? null }),
        ...(body.available === undefined ? {} : { available: body.available }),
        ...(body.sortOrder === undefined ? {} : { sortOrder: body.sortOrder }),
      },
    });

    return { kind: 'ok' as const, updated };
  });

  if (result.kind === 'not_found') {
    return reply.code(404).send(error('product_not_found', 'Produto não encontrado'));
  }
  if (result.kind === 'category_not_found') {
    return reply.code(404).send(error('category_not_found', 'Categoria não encontrada'));
  }
  if (result.kind === 'duplicate') {
    return reply
      .code(409)
      .send(error('product_already_exists', 'Já existe produto com esse nome na categoria'));
  }

  return { data: serializeProduct(result.updated) };
}

export async function updateProductAvailabilityHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = productIdParamSchema.parse(request.params);
  const body = updateProductAvailabilitySchema.parse(request.body);

  const result = await request.withTenant(async (db) => {
    const product = await db.product.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!product) return { kind: 'not_found' as const };

    const updated = await db.product.update({
      where: { id },
      data: { available: body.available },
    });

    return { kind: 'ok' as const, updated };
  });

  if (result.kind === 'not_found') {
    return reply.code(404).send(error('product_not_found', 'Produto não encontrado'));
  }

  return { data: serializeProduct(result.updated) };
}

export async function deleteProductHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = productIdParamSchema.parse(request.params);

  const result = await request.withTenant(async (db) => {
    const product = await db.product.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!product) return { kind: 'not_found' as const };

    const inUse = await db.orderItem.findFirst({
      where: {
        productId: id,
        order: { status: { in: ['pending', 'preparing', 'ready', 'out_for_delivery'] } },
      },
      select: { id: true },
    });

    if (inUse) return { kind: 'in_use' as const };

    const now = new Date();

    await db.productAddon.updateMany({
      where: { productId: id, deletedAt: null },
      data: { deletedAt: now, available: false },
    });
    const deleted = await db.product.update({
      where: { id },
      data: { available: false, deletedAt: now },
    });

    return { kind: 'ok' as const, deleted };
  });

  if (result.kind === 'not_found') {
    return reply.code(404).send(error('product_not_found', 'Produto não encontrado'));
  }
  if (result.kind === 'in_use') {
    return reply.code(409).send(error('product_in_use', 'Produto possui pedidos em aberto'));
  }

  return { data: serializeProduct(result.deleted) };
}
