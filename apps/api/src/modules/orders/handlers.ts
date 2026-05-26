import { randomUUID } from 'node:crypto';

import { Prisma } from '@cafe/db';
import { type OrderStatusValue, deliveryScheduleSchema, isDeliveryOpen } from '@cafe/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  ACTIVE_ORDER_STATUSES,
  type ResolvedItem,
  calculateItemsSubtotal,
  calculateOrderTotal,
  canTransition,
  decimalOrNull,
  resolveItemsForOrder,
  startOfDayUTC,
} from './helpers.js';
import {
  addOrderItemSchema,
  createOrderSchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
  orderItemParamSchema,
  updateOrderStatusSchema,
} from './schemas.js';

const DAILY_NUMBER_MAX_RETRIES = 5;

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

type OrderRecord = Prisma.OrderGetPayload<{
  include: {
    items: { include: { addons: true } };
    table: true;
    customer: true;
  };
}>;

function serializeOrder(order: OrderRecord) {
  return {
    id: order.id,
    organizationId: order.organizationId,
    idempotencyKey: order.idempotencyKey,
    dailyNumber: order.dailyNumber,
    orderDate: order.orderDate.toISOString(),
    type: order.type,
    status: order.status,
    version: order.version,
    tableId: order.tableId,
    customerId: order.customerId,
    subtotal: order.subtotal.toFixed(2),
    discountAmount: decimalOrNull(order.discountAmount),
    serviceChargeAmount: decimalOrNull(order.serviceChargeAmount),
    taxAmount: decimalOrNull(order.taxAmount),
    deliveryFee: decimalOrNull(order.deliveryFee),
    total: order.total.toFixed(2),
    currency: order.currency,
    notes: order.notes,
    kitchenNotes: order.kitchenNotes,
    deliveryAddress: order.deliveryAddress,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    finishedAt: order.finishedAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    cancelReason: order.cancelReason,
    cancelledById: order.cancelledById,
    table: order.table
      ? {
          id: order.table.id,
          number: order.table.number,
          capacity: order.table.capacity,
        }
      : null,
    customer: order.customer
      ? {
          id: order.customer.id,
          name: order.customer.name,
          phone: order.customer.phone,
        }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productNameSnapshot: item.productNameSnapshot,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      notes: item.notes,
      createdAt: item.createdAt.toISOString(),
      addons: item.addons.map((addon) => ({
        id: addon.id,
        productAddonId: addon.productAddonId,
        addonNameSnapshot: addon.addonNameSnapshot,
        quantity: addon.quantity,
        unitPrice: addon.unitPrice.toFixed(2),
      })),
    })),
  };
}

const ORDER_INCLUDE = {
  items: { include: { addons: true }, orderBy: { createdAt: Prisma.SortOrder.asc } },
  table: true,
  customer: true,
} as const;

async function findOrderForTenant(
  request: FastifyRequest,
  tenantId: string,
  orderId: string,
): Promise<OrderRecord | null> {
  return request.server.prisma.order.findFirst({
    where: { id: orderId, organizationId: tenantId },
    include: ORDER_INCLUDE,
  });
}

async function nextDailyNumber(
  tx: Prisma.TransactionClient,
  tenantId: string,
  orderDate: Date,
): Promise<number> {
  const aggregate = await tx.order.aggregate({
    where: { organizationId: tenantId, orderDate },
    _max: { dailyNumber: true },
  });
  return (aggregate._max.dailyNumber ?? 0) + 1;
}

function recalcTotals(
  items: ResolvedItem[],
  existing?: Partial<
    Pick<OrderRecord, 'discountAmount' | 'serviceChargeAmount' | 'taxAmount' | 'deliveryFee'>
  >,
) {
  const subtotal = calculateItemsSubtotal(items);
  const total = calculateOrderTotal(subtotal, {
    discount: existing?.discountAmount ?? null,
    serviceCharge: existing?.serviceChargeAmount ?? null,
    tax: existing?.taxAmount ?? null,
    deliveryFee: existing?.deliveryFee ?? null,
  });
  return { subtotal, total };
}

export async function createOrderHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const body = createOrderSchema.parse(request.body);
  const idempotencyKey = body.idempotencyKey ?? randomUUID();

  const existingByKey = await request.server.prisma.order.findUnique({
    where: { idempotencyKey },
    include: ORDER_INCLUDE,
  });

  if (existingByKey) {
    if (existingByKey.organizationId !== tenantId) {
      return reply.code(409).send(error('idempotency_conflict', 'idempotencyKey já utilizado'));
    }
    return reply.code(200).send({ data: serializeOrder(existingByKey) });
  }

  if (body.type === 'dine_in') {
    if (!body.tableId) {
      return reply.code(422).send(error('table_required', 'tableId obrigatório para dine_in'));
    }
    const table = await request.server.prisma.table.findFirst({
      where: { id: body.tableId, organizationId: tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!table) {
      return reply.code(404).send(error('table_not_found', 'Mesa não encontrada'));
    }

    const activeOnTable = await request.server.prisma.order.findFirst({
      where: {
        organizationId: tenantId,
        tableId: body.tableId,
        type: 'dine_in',
        status: { in: ACTIVE_ORDER_STATUSES },
      },
      select: { id: true },
    });
    if (activeOnTable) {
      return reply.code(409).send(error('table_busy', 'Mesa já possui pedido em aberto'));
    }
  }

  let deliveryFeeToApply: Prisma.Decimal | null = null;
  let deliveryAddressSnapshot: string | null = body.deliveryAddress ?? null;

  if (body.type === 'delivery') {
    if (!body.customerId) {
      return reply
        .code(422)
        .send(error('customer_required', 'customerId obrigatório para delivery'));
    }

    const [org, customer] = await Promise.all([
      request.server.prisma.organization.findUnique({
        where: { id: tenantId },
        select: {
          deliveryEnabled: true,
          deliverySchedule: true,
          defaultDeliveryFee: true,
        },
      }),
      request.server.prisma.customer.findFirst({
        where: { id: body.customerId, organizationId: tenantId, deletedAt: null },
        select: {
          id: true,
          address: true,
          neighborhood: true,
          reference: true,
        },
      }),
    ]);

    if (!customer) {
      return reply.code(404).send(error('customer_not_found', 'Cliente não encontrado'));
    }

    if (!org || !org.deliveryEnabled) {
      return reply
        .code(409)
        .send(error('delivery_disabled', 'Delivery está desativado nesta organização'));
    }

    if (org.deliverySchedule !== null) {
      const parsed = deliveryScheduleSchema.safeParse(org.deliverySchedule);
      if (parsed.success && !isDeliveryOpen(parsed.data)) {
        return reply
          .code(409)
          .send(error('delivery_closed', 'Delivery está fechado neste horário'));
      }
    }

    deliveryFeeToApply = org.defaultDeliveryFee ?? null;

    if (!deliveryAddressSnapshot) {
      const parts = [customer.address, customer.neighborhood, customer.reference].filter(
        (part): part is string => typeof part === 'string' && part.length > 0,
      );
      deliveryAddressSnapshot = parts.length > 0 ? parts.join(' - ') : null;
    }

    if (!deliveryAddressSnapshot) {
      return reply
        .code(422)
        .send(
          error(
            'delivery_address_required',
            'Endereço de entrega obrigatório (informe deliveryAddress ou cadastre no cliente)',
          ),
        );
    }
  }

  const resolution = await resolveItemsForOrder(request.server.prisma, tenantId, body.items);
  if (!resolution.ok) {
    return reply.code(422).send(error(resolution.error.code, resolution.error.message));
  }

  const items = resolution.items;
  const { subtotal, total } = recalcTotals(items, { deliveryFee: deliveryFeeToApply });
  const orderDate = startOfDayUTC();

  for (let attempt = 0; attempt < DAILY_NUMBER_MAX_RETRIES; attempt += 1) {
    try {
      const created = await request.server.prisma.$transaction(async (tx) => {
        const dailyNumber = await nextDailyNumber(tx, tenantId, orderDate);

        return tx.order.create({
          data: {
            organizationId: tenantId,
            idempotencyKey,
            dailyNumber,
            orderDate,
            type: body.type,
            status: 'pending',
            tableId: body.type === 'dine_in' ? (body.tableId ?? null) : null,
            customerId: body.type === 'delivery' ? (body.customerId ?? null) : null,
            notes: body.notes ?? null,
            kitchenNotes: body.kitchenNotes ?? null,
            deliveryAddress: deliveryAddressSnapshot,
            deliveryFee: deliveryFeeToApply,
            subtotal,
            total,
            items: {
              create: items.map((item) => ({
                organizationId: tenantId,
                productId: item.productId,
                productNameSnapshot: item.productNameSnapshot,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                notes: item.notes,
                addons: {
                  create: item.addons.map((addon) => ({
                    organizationId: tenantId,
                    productAddonId: addon.productAddonId,
                    addonNameSnapshot: addon.addonNameSnapshot,
                    quantity: addon.quantity,
                    unitPrice: addon.unitPrice,
                  })),
                },
              })),
            },
          },
          include: ORDER_INCLUDE,
        });
      });

      return reply.code(201).send({ data: serializeOrder(created) });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        Array.isArray((err.meta as { target?: string[] } | undefined)?.target) &&
        (err.meta as { target: string[] }).target.includes('dailyNumber')
      ) {
        if (attempt === DAILY_NUMBER_MAX_RETRIES - 1) {
          request.log.error({ err }, 'Falha ao alocar dailyNumber após múltiplas tentativas');
          return reply
            .code(503)
            .send(error('daily_number_conflict', 'Tente novamente em instantes'));
        }
        continue;
      }
      throw err;
    }
  }

  return reply.code(503).send(error('daily_number_conflict', 'Tente novamente em instantes'));
}

export async function listOrdersHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const query = listOrdersQuerySchema.parse(request.query);

  const dateFilter: Prisma.OrderWhereInput = {};
  if (query.dateFrom || query.dateTo) {
    dateFilter.createdAt = {
      ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
    };
  }

  const statusFilter: Prisma.OrderWhereInput =
    query.status !== undefined
      ? { status: query.status }
      : query.active === true
        ? { status: { in: ACTIVE_ORDER_STATUSES } }
        : query.active === false
          ? { status: { in: ['finished', 'cancelled'] } }
          : {};

  const orders = await request.server.prisma.order.findMany({
    where: {
      organizationId: tenantId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.tableId ? { tableId: query.tableId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...statusFilter,
      ...dateFilter,
    },
    include: ORDER_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 100,
  });

  return { data: orders.map(serializeOrder) };
}

export async function getOrderHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = orderIdParamSchema.parse(request.params);

  const order = await findOrderForTenant(request, tenantId, id);
  if (!order) {
    return reply.code(404).send(error('order_not_found', 'Pedido não encontrado'));
  }

  return { data: serializeOrder(order) };
}

export async function addOrderItemHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = orderIdParamSchema.parse(request.params);
  const body = addOrderItemSchema.parse(request.body);

  const order = await findOrderForTenant(request, tenantId, id);
  if (!order) {
    return reply.code(404).send(error('order_not_found', 'Pedido não encontrado'));
  }

  if (!['pending', 'preparing'].includes(order.status)) {
    return reply
      .code(409)
      .send(error('order_not_open', 'Pedido não aceita mais itens nesse status'));
  }

  const resolution = await resolveItemsForOrder(request.server.prisma, tenantId, [body]);
  if (!resolution.ok) {
    return reply.code(422).send(error(resolution.error.code, resolution.error.message));
  }

  const newItem = resolution.items[0];
  if (!newItem) {
    return reply.code(422).send(error('invalid_item', 'Item inválido'));
  }

  const allResolvedItems: ResolvedItem[] = [
    ...order.items.map((existing) => ({
      productId: existing.productId,
      productNameSnapshot: existing.productNameSnapshot,
      quantity: existing.quantity,
      unitPrice: existing.unitPrice,
      notes: existing.notes,
      addons: existing.addons.map((addon) => ({
        productAddonId: addon.productAddonId,
        addonNameSnapshot: addon.addonNameSnapshot,
        quantity: addon.quantity,
        unitPrice: addon.unitPrice,
      })),
    })),
    newItem,
  ];

  const { subtotal, total } = recalcTotals(allResolvedItems, order);

  const updated = await request.server.prisma.$transaction(async (tx) => {
    await tx.orderItem.create({
      data: {
        organizationId: tenantId,
        orderId: order.id,
        productId: newItem.productId,
        productNameSnapshot: newItem.productNameSnapshot,
        quantity: newItem.quantity,
        unitPrice: newItem.unitPrice,
        notes: newItem.notes,
        addons: {
          create: newItem.addons.map((addon) => ({
            organizationId: tenantId,
            productAddonId: addon.productAddonId,
            addonNameSnapshot: addon.addonNameSnapshot,
            quantity: addon.quantity,
            unitPrice: addon.unitPrice,
          })),
        },
      },
    });

    return tx.order.update({
      where: { id: order.id },
      data: {
        subtotal,
        total,
        version: { increment: 1 },
      },
      include: ORDER_INCLUDE,
    });
  });

  return reply.code(201).send({ data: serializeOrder(updated) });
}

export async function removeOrderItemHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id, itemId } = orderItemParamSchema.parse(request.params);

  const order = await findOrderForTenant(request, tenantId, id);
  if (!order) {
    return reply.code(404).send(error('order_not_found', 'Pedido não encontrado'));
  }

  if (!['pending', 'preparing'].includes(order.status)) {
    return reply
      .code(409)
      .send(error('order_not_open', 'Pedido não permite remover itens nesse status'));
  }

  const item = order.items.find((entry) => entry.id === itemId);
  if (!item) {
    return reply.code(404).send(error('order_item_not_found', 'Item não encontrado'));
  }

  if (order.items.length === 1) {
    return reply
      .code(409)
      .send(error('order_last_item', 'Cancele o pedido em vez de remover o último item'));
  }

  const remaining = order.items.filter((entry) => entry.id !== itemId);
  const resolvedRemaining: ResolvedItem[] = remaining.map((existing) => ({
    productId: existing.productId,
    productNameSnapshot: existing.productNameSnapshot,
    quantity: existing.quantity,
    unitPrice: existing.unitPrice,
    notes: existing.notes,
    addons: existing.addons.map((addon) => ({
      productAddonId: addon.productAddonId,
      addonNameSnapshot: addon.addonNameSnapshot,
      quantity: addon.quantity,
      unitPrice: addon.unitPrice,
    })),
  }));

  const { subtotal, total } = recalcTotals(resolvedRemaining, order);

  const updated = await request.server.prisma.$transaction(async (tx) => {
    await tx.orderItem.delete({ where: { id: itemId } });
    return tx.order.update({
      where: { id: order.id },
      data: {
        subtotal,
        total,
        version: { increment: 1 },
      },
      include: ORDER_INCLUDE,
    });
  });

  return { data: serializeOrder(updated) };
}

export async function updateOrderStatusHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = orderIdParamSchema.parse(request.params);
  const body = updateOrderStatusSchema.parse(request.body);

  const order = await findOrderForTenant(request, tenantId, id);
  if (!order) {
    return reply.code(404).send(error('order_not_found', 'Pedido não encontrado'));
  }

  if (order.version !== body.version) {
    return reply
      .code(409)
      .send(error('order_version_mismatch', 'Pedido foi atualizado por outro usuário'));
  }

  if (order.status === body.status) {
    return reply.code(200).send({ data: serializeOrder(order) });
  }

  if (!canTransition(order.status, body.status, order.type)) {
    return reply
      .code(422)
      .send(
        error('invalid_status_transition', `Transição inválida: ${order.status} → ${body.status}`),
      );
  }

  const now = new Date();
  const data: Prisma.OrderUpdateInput = {
    status: body.status,
    version: { increment: 1 },
    ...(body.status === 'cancelled'
      ? {
          cancelledAt: now,
          cancelReason: body.cancelReason ?? null,
          ...(request.authSession
            ? {
                cancelledBy: {
                  connect: { id: request.authSession.user.id },
                },
              }
            : {}),
        }
      : {}),
    ...(body.status === 'finished' ? { finishedAt: now } : {}),
  };

  const updated = await request.server.prisma.order.update({
    where: { id: order.id },
    data,
    include: ORDER_INCLUDE,
  });

  return { data: serializeOrder(updated) };
}

export type OrderStatusForKitchen = OrderStatusValue;
