import { Prisma } from '@cafe/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  categoryIdParamSchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  reorderCategoriesSchema,
  updateCategorySchema,
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

function serializeCategory(category: {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  return {
    ...category,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
    deletedAt: category.deletedAt?.toISOString() ?? null,
  };
}

export async function listCategoriesHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const query = listCategoriesQuerySchema.parse(request.query);

  const categories = await request.server.prisma.category.findMany({
    where: {
      organizationId: tenantId,
      ...(query.active === undefined ? {} : { active: query.active }),
      ...(query.includeDeleted ? {} : { deletedAt: null }),
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return { data: categories.map(serializeCategory) };
}

export async function createCategoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const body = createCategorySchema.parse(request.body);

  const existing = await request.server.prisma.category.findFirst({
    where: {
      organizationId: tenantId,
      name: body.name,
      deletedAt: null,
    },
  });

  if (existing) {
    return reply.code(409).send(error('category_already_exists', 'Categoria já cadastrada'));
  }

  const maxSort = await request.server.prisma.category.aggregate({
    where: { organizationId: tenantId, deletedAt: null },
    _max: { sortOrder: true },
  });

  const category = await request.server.prisma.category.create({
    data: {
      organizationId: tenantId,
      name: body.name,
      sortOrder: body.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return reply.code(201).send({ data: serializeCategory(category) });
}

export async function updateCategoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = categoryIdParamSchema.parse(request.params);
  const body = updateCategorySchema.parse(request.body);

  const category = await request.server.prisma.category.findFirst({
    where: {
      id,
      organizationId: tenantId,
      deletedAt: null,
    },
  });

  if (!category) {
    return reply.code(404).send(error('category_not_found', 'Categoria não encontrada'));
  }

  if (body.name && body.name !== category.name) {
    const existing = await request.server.prisma.category.findFirst({
      where: {
        organizationId: tenantId,
        name: body.name,
        deletedAt: null,
        id: { not: id },
      },
    });

    if (existing) {
      return reply.code(409).send(error('category_already_exists', 'Categoria já cadastrada'));
    }
  }

  const updated = await request.server.prisma.category.update({
    where: { id },
    data: {
      ...(body.name === undefined ? {} : { name: body.name }),
      ...(body.sortOrder === undefined ? {} : { sortOrder: body.sortOrder }),
      ...(body.active === undefined ? {} : { active: body.active }),
    },
  });

  return { data: serializeCategory(updated) };
}

export async function deleteCategoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = categoryIdParamSchema.parse(request.params);

  const category = await request.server.prisma.category.findFirst({
    where: {
      id,
      organizationId: tenantId,
      deletedAt: null,
    },
    include: {
      _count: {
        select: {
          products: {
            where: { deletedAt: null },
          },
        },
      },
    },
  });

  if (!category) {
    return reply.code(404).send(error('category_not_found', 'Categoria não encontrada'));
  }

  if (category._count.products > 0) {
    return reply.code(409).send(error('category_has_products', 'Categoria possui produtos ativos'));
  }

  const deleted = await request.server.prisma.category.update({
    where: { id },
    data: {
      active: false,
      deletedAt: new Date(),
    },
  });

  return { data: serializeCategory(deleted) };
}

export async function reorderCategoriesHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const body = reorderCategoriesSchema.parse(request.body);
  const uniqueIds = new Set(body.ids);

  if (uniqueIds.size !== body.ids.length) {
    return reply.code(422).send(error('duplicated_ids', 'IDs repetidos na ordenação'));
  }

  const categories = await request.server.prisma.category.findMany({
    where: {
      id: { in: body.ids },
      organizationId: tenantId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (categories.length !== body.ids.length) {
    return reply
      .code(404)
      .send(error('category_not_found', 'Uma ou mais categorias não foram encontradas'));
  }

  await request.server.prisma.$transaction(
    body.ids.map((id: string, sortOrder: number) =>
      request.server.prisma.category.update({
        where: { id },
        data: { sortOrder },
      }),
    ),
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    },
  );

  const ordered = await request.server.prisma.category.findMany({
    where: {
      id: { in: body.ids },
      organizationId: tenantId,
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return { data: ordered.map(serializeCategory) };
}
