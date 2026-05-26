import { Prisma } from '@cafe/db';
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

async function ensureCategoryBelongsToTenant(
  request: FastifyRequest,
  tenantId: string,
  categoryId: string,
) {
  const category = await request.server.prisma.category.findFirst({
    where: { id: categoryId, organizationId: tenantId, deletedAt: null },
    select: { id: true },
  });
  return category !== null;
}

export async function listProductsHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const query = listProductsQuerySchema.parse(request.query);

  const products = await request.server.prisma.product.findMany({
    where: {
      organizationId: tenantId,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.available === undefined ? {} : { available: query.available }),
      ...(query.includeDeleted ? {} : { deletedAt: null }),
    },
    orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  });

  return { data: products.map(serializeProduct) };
}

export async function getProductHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = productIdParamSchema.parse(request.params);

  const product = await request.server.prisma.product.findFirst({
    where: { id, organizationId: tenantId, deletedAt: null },
    include: {
      addons: {
        where: { deletedAt: null },
        orderBy: [{ createdAt: 'asc' }],
      },
    },
  });

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

  const categoryOk = await ensureCategoryBelongsToTenant(request, tenantId, body.categoryId);
  if (!categoryOk) {
    return reply.code(404).send(error('category_not_found', 'Categoria não encontrada'));
  }

  const existing = await request.server.prisma.product.findFirst({
    where: {
      organizationId: tenantId,
      categoryId: body.categoryId,
      name: body.name,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (existing) {
    return reply
      .code(409)
      .send(error('product_already_exists', 'Já existe produto com esse nome na categoria'));
  }

  const maxSort = await request.server.prisma.product.aggregate({
    where: { organizationId: tenantId, categoryId: body.categoryId, deletedAt: null },
    _max: { sortOrder: true },
  });

  const product = await request.server.prisma.product.create({
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

  return reply.code(201).send({ data: serializeProduct(product) });
}

export async function updateProductHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = productIdParamSchema.parse(request.params);
  const body = updateProductSchema.parse(request.body);

  const product = await request.server.prisma.product.findFirst({
    where: { id, organizationId: tenantId, deletedAt: null },
  });

  if (!product) {
    return reply.code(404).send(error('product_not_found', 'Produto não encontrado'));
  }

  if (body.categoryId && body.categoryId !== product.categoryId) {
    const categoryOk = await ensureCategoryBelongsToTenant(request, tenantId, body.categoryId);
    if (!categoryOk) {
      return reply.code(404).send(error('category_not_found', 'Categoria não encontrada'));
    }
  }

  const targetCategoryId = body.categoryId ?? product.categoryId;
  const targetName = body.name ?? product.name;

  if (body.name !== undefined || body.categoryId !== undefined) {
    const conflict = await request.server.prisma.product.findFirst({
      where: {
        organizationId: tenantId,
        categoryId: targetCategoryId,
        name: targetName,
        deletedAt: null,
        id: { not: id },
      },
      select: { id: true },
    });

    if (conflict) {
      return reply
        .code(409)
        .send(error('product_already_exists', 'Já existe produto com esse nome na categoria'));
    }
  }

  const updated = await request.server.prisma.product.update({
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

  return { data: serializeProduct(updated) };
}

export async function updateProductAvailabilityHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = productIdParamSchema.parse(request.params);
  const body = updateProductAvailabilitySchema.parse(request.body);

  const product = await request.server.prisma.product.findFirst({
    where: { id, organizationId: tenantId, deletedAt: null },
    select: { id: true },
  });

  if (!product) {
    return reply.code(404).send(error('product_not_found', 'Produto não encontrado'));
  }

  const updated = await request.server.prisma.product.update({
    where: { id },
    data: { available: body.available },
  });

  return { data: serializeProduct(updated) };
}

export async function deleteProductHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = productIdParamSchema.parse(request.params);

  const product = await request.server.prisma.product.findFirst({
    where: { id, organizationId: tenantId, deletedAt: null },
    select: { id: true },
  });

  if (!product) {
    return reply.code(404).send(error('product_not_found', 'Produto não encontrado'));
  }

  const inUse = await request.server.prisma.orderItem.findFirst({
    where: {
      productId: id,
      order: { status: { in: ['pending', 'preparing', 'ready', 'out_for_delivery'] } },
    },
    select: { id: true },
  });

  if (inUse) {
    return reply.code(409).send(error('product_in_use', 'Produto possui pedidos em aberto'));
  }

  const now = new Date();

  const [, deleted] = await request.server.prisma.$transaction([
    request.server.prisma.productAddon.updateMany({
      where: { productId: id, organizationId: tenantId, deletedAt: null },
      data: { deletedAt: now, available: false },
    }),
    request.server.prisma.product.update({
      where: { id },
      data: { available: false, deletedAt: now },
    }),
  ]);

  return { data: serializeProduct(deleted) };
}
