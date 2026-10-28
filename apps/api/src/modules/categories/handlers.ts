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

  const categories = await request.withTenant((db) =>
    db.category.findMany({
      where: {
        ...(query.active === undefined ? {} : { active: query.active }),
        ...(query.includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
  );

  return { data: categories.map(serializeCategory) };
}

export async function createCategoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const body = createCategorySchema.parse(request.body);

  const result = await request.withTenant(async (db) => {
    const existing = await db.category.findFirst({
      where: {
        name: body.name,
        deletedAt: null,
      },
    });

    if (existing) return { kind: 'duplicate' as const };

    const maxSort = await db.category.aggregate({
      where: { deletedAt: null },
      _max: { sortOrder: true },
    });

    const category = await db.category.create({
      data: {
        organizationId: tenantId,
        name: body.name,
        sortOrder: body.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    return { kind: 'ok' as const, category };
  });

  if (result.kind === 'duplicate') {
    return reply.code(409).send(error('category_already_exists', 'Categoria já cadastrada'));
  }

  return reply.code(201).send({ data: serializeCategory(result.category) });
}

export async function updateCategoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = categoryIdParamSchema.parse(request.params);
  const body = updateCategorySchema.parse(request.body);

  const result = await request.withTenant(async (db) => {
    const category = await db.category.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!category) return { kind: 'not_found' as const };

    if (body.name && body.name !== category.name) {
      const existing = await db.category.findFirst({
        where: {
          name: body.name,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (existing) return { kind: 'duplicate' as const };
    }

    const updated = await db.category.update({
      where: { id },
      data: {
        ...(body.name === undefined ? {} : { name: body.name }),
        ...(body.sortOrder === undefined ? {} : { sortOrder: body.sortOrder }),
        ...(body.active === undefined ? {} : { active: body.active }),
      },
    });

    return { kind: 'ok' as const, updated };
  });

  if (result.kind === 'not_found') {
    return reply.code(404).send(error('category_not_found', 'Categoria não encontrada'));
  }

  if (result.kind === 'duplicate') {
    return reply.code(409).send(error('category_already_exists', 'Categoria já cadastrada'));
  }

  return { data: serializeCategory(result.updated) };
}

export async function deleteCategoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = categoryIdParamSchema.parse(request.params);

  const result = await request.withTenant(async (db) => {
    const category = await db.category.findFirst({
      where: {
        id,
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

    if (!category) return { kind: 'not_found' as const };
    if (category._count.products > 0) return { kind: 'has_products' as const };

    const deleted = await db.category.update({
      where: { id },
      data: {
        active: false,
        deletedAt: new Date(),
      },
    });

    return { kind: 'ok' as const, deleted };
  });

  if (result.kind === 'not_found') {
    return reply.code(404).send(error('category_not_found', 'Categoria não encontrada'));
  }

  if (result.kind === 'has_products') {
    return reply.code(409).send(error('category_has_products', 'Categoria possui produtos ativos'));
  }

  return { data: serializeCategory(result.deleted) };
}

export async function reorderCategoriesHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const body = reorderCategoriesSchema.parse(request.body);
  const uniqueIds = new Set(body.ids);

  if (uniqueIds.size !== body.ids.length) {
    return reply.code(422).send(error('duplicated_ids', 'IDs repetidos na ordenação'));
  }

  const result = await request.withTenant(
    async (db) => {
      const categories = await db.category.findMany({
        where: {
          id: { in: body.ids },
          deletedAt: null,
        },
        select: { id: true },
      });

      if (categories.length !== body.ids.length) return { kind: 'not_found' as const };

      await Promise.all(
        body.ids.map((id: string, sortOrder: number) =>
          db.category.update({
            where: { id },
            data: { sortOrder },
          }),
        ),
      );

      const ordered = await db.category.findMany({
        where: {
          id: { in: body.ids },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      return { kind: 'ok' as const, ordered };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );

  if (result.kind === 'not_found') {
    return reply
      .code(404)
      .send(error('category_not_found', 'Uma ou mais categorias não foram encontradas'));
  }

  return { data: result.ordered.map(serializeCategory) };
}
