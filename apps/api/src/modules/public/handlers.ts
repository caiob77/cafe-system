import { type Prisma, withTenantTx } from '@cafe/db';
import { deliveryScheduleSchema, isDeliveryOpen } from '@cafe/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { createOrderHandler } from '../orders/handlers.js';
import { createPublicOrderSchema, publicSlugParamSchema } from './schemas.js';

function error(code: string, message: string) {
  return { error: { code, message } };
}

async function resolvePublicOrganization(request: FastifyRequest, slug: string) {
  return request.server.prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      addressLine: true,
      phone: true,
      deliveryEnabled: true,
      deliverySchedule: true,
      defaultDeliveryFee: true,
      suspendedAt: true,
    },
  });
}

function serializeDeliverySettings(org: {
  deliveryEnabled: boolean;
  deliverySchedule: Prisma.JsonValue | null;
  defaultDeliveryFee: Prisma.Decimal | null;
}) {
  const parsedSchedule =
    org.deliverySchedule === null ? null : deliveryScheduleSchema.safeParse(org.deliverySchedule);

  return {
    deliveryEnabled: org.deliveryEnabled,
    deliveryOpen:
      org.deliveryEnabled &&
      (parsedSchedule === null || !parsedSchedule.success || isDeliveryOpen(parsedSchedule.data)),
    deliverySchedule: org.deliverySchedule,
    defaultDeliveryFee: org.defaultDeliveryFee?.toFixed(2) ?? null,
  };
}

export async function getPublicMenuHandler(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = publicSlugParamSchema.parse(request.params);
  const org = await resolvePublicOrganization(request, slug);

  if (!org || org.suspendedAt) {
    return reply.code(404).send(error('store_not_found', 'Loja não encontrada'));
  }

  const [categories, products] = await withTenantTx(request.server.prisma, org.id, (db) =>
    Promise.all([
      db.category.findMany({
        where: { organizationId: org.id, active: true, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      db.product.findMany({
        where: {
          organizationId: org.id,
          available: true,
          deletedAt: null,
          category: { active: true, deletedAt: null },
        },
        include: {
          addons: {
            where: { available: true, deletedAt: null },
            orderBy: [{ createdAt: 'asc' }],
          },
        },
        orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      }),
    ]),
  );

  return {
    data: {
      organization: {
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        addressLine: org.addressLine,
        phone: org.phone,
      },
      delivery: serializeDeliverySettings(org),
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sortOrder,
      })),
      products: products.map((product) => ({
        id: product.id,
        categoryId: product.categoryId,
        name: product.name,
        description: product.description,
        price: product.price.toFixed(2),
        imageUrl: product.imageUrl,
        sortOrder: product.sortOrder,
        addons: product.addons.map((addon) => ({
          id: addon.id,
          name: addon.name,
          price: addon.price.toFixed(2),
        })),
      })),
    },
  };
}

export async function getPublicDeliverySettingsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { slug } = publicSlugParamSchema.parse(request.params);
  const org = await resolvePublicOrganization(request, slug);

  if (!org || org.suspendedAt) {
    return reply.code(404).send(error('store_not_found', 'Loja não encontrada'));
  }

  const fees = await withTenantTx(request.server.prisma, org.id, (db) =>
    db.deliveryNeighborhoodFee.findMany({
      where: { organizationId: org.id },
      orderBy: { neighborhood: 'asc' },
    }),
  );

  return {
    data: {
      ...serializeDeliverySettings(org),
      neighborhoods: fees.map((fee) => ({
        id: fee.id,
        neighborhood: fee.neighborhood,
        fee: fee.fee.toFixed(2),
      })),
    },
  };
}

export async function createPublicOrderHandler(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = publicSlugParamSchema.parse(request.params);
  const body = createPublicOrderSchema.parse(request.body);
  const org = await resolvePublicOrganization(request, slug);

  if (!org || org.suspendedAt) {
    return reply.code(404).send(error('store_not_found', 'Loja não encontrada'));
  }

  const productIds = [...new Set(body.items.map((item) => item.productId))];
  const publicProducts = await withTenantTx(request.server.prisma, org.id, (db) =>
    db.product.findMany({
      where: {
        id: { in: productIds },
        organizationId: org.id,
        available: true,
        deletedAt: null,
        category: { active: true, deletedAt: null },
      },
      select: { id: true },
    }),
  );
  const publicProductIds = new Set(publicProducts.map((product) => product.id));
  const hiddenProductId = productIds.find((id) => !publicProductIds.has(id));
  if (hiddenProductId) {
    return reply
      .code(422)
      .send(error('product_unavailable', `Produto ${hiddenProductId} indisponível`));
  }

  if (!org.deliveryEnabled) {
    return reply
      .code(409)
      .send(error('delivery_disabled', 'Delivery está desativado nesta organização'));
  }

  if (org.deliverySchedule !== null) {
    const parsed = deliveryScheduleSchema.safeParse(org.deliverySchedule);
    if (parsed.success && !isDeliveryOpen(parsed.data)) {
      return reply.code(409).send(error('delivery_closed', 'Delivery está fechado neste horário'));
    }
  }

  const deliveryZone = await withTenantTx(request.server.prisma, org.id, async (db) => {
    const count = await db.deliveryNeighborhoodFee.count({
      where: { organizationId: org.id },
    });
    if (count === 0) return { strict: false as const };

    const zone = await db.deliveryNeighborhoodFee.findFirst({
      where: {
        organizationId: org.id,
        neighborhood: { equals: body.customer.neighborhood, mode: 'insensitive' },
      },
      select: { id: true },
    });
    return { strict: true as const, found: Boolean(zone) };
  });

  if (deliveryZone.strict && !deliveryZone.found) {
    return reply
      .code(422)
      .send(
        error(
          'delivery_area_unsupported',
          `Não entregamos no bairro "${body.customer.neighborhood}"`,
        ),
      );
  }

  const customer = await withTenantTx(request.server.prisma, org.id, async (db) => {
    const existing = await db.customer.findUnique({
      where: { organizationId_phone: { organizationId: org.id, phone: body.customer.phone } },
    });

    if (existing) {
      return db.customer.update({
        where: { id: existing.id },
        data: {
          name: body.customer.name,
          address: body.customer.address,
          neighborhood: body.customer.neighborhood,
          reference: body.customer.reference,
          deletedAt: null,
        },
      });
    }

    return db.customer.create({
      data: {
        organizationId: org.id,
        name: body.customer.name,
        phone: body.customer.phone,
        address: body.customer.address,
        neighborhood: body.customer.neighborhood,
        reference: body.customer.reference,
      },
    });
  });

  request.tenantId = org.id;
  request.body = {
    type: 'delivery',
    customerId: customer.id,
    deliveryAddress: [body.customer.address, body.customer.neighborhood, body.customer.reference]
      .filter(Boolean)
      .join(' - '),
    notes: body.notes,
    idempotencyKey: body.idempotencyKey,
    items: body.items,
  };

  return createOrderHandler(request, reply);
}
