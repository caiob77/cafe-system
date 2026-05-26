import type { TableStatusValue } from '@cafe/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  createTableSchema,
  listTablesQuerySchema,
  tableIdParamSchema,
  updateTableSchema,
} from './schemas.js';

const ACTIVE_ORDER_STATUSES = ['pending', 'preparing', 'ready', 'out_for_delivery'] as const;
const AWAITING_PAYMENT_STATUSES = ['delivered'] as const;

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

type TableRecord = {
  id: string;
  organizationId: string;
  number: number;
  capacity: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

function serializeTable(
  table: TableRecord,
  status: TableStatusValue,
  activeOrderId: string | null,
) {
  return {
    id: table.id,
    organizationId: table.organizationId,
    number: table.number,
    capacity: table.capacity,
    status,
    activeOrderId,
    createdAt: table.createdAt.toISOString(),
    updatedAt: table.updatedAt.toISOString(),
    deletedAt: table.deletedAt?.toISOString() ?? null,
  };
}

type ActiveOrderInfo = { id: string; status: string };

function deriveStatus(activeOrders: ActiveOrderInfo[]): TableStatusValue {
  if (activeOrders.length === 0) return 'free';

  const allAwaitingPayment = activeOrders.every((order) =>
    (AWAITING_PAYMENT_STATUSES as readonly string[]).includes(order.status),
  );
  if (allAwaitingPayment) return 'awaiting_payment';

  return 'occupied';
}

function pickActiveOrderId(activeOrders: ActiveOrderInfo[]): string | null {
  return activeOrders[0]?.id ?? null;
}

export async function listTablesHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const query = listTablesQuerySchema.parse(request.query);

  const tables = await request.server.prisma.table.findMany({
    where: {
      organizationId: tenantId,
      ...(query.includeDeleted ? {} : { deletedAt: null }),
    },
    orderBy: [{ number: 'asc' }],
  });

  if (tables.length === 0) {
    return { data: [] };
  }

  const tableIds = tables.map((table) => table.id);
  const activeOrders = await request.server.prisma.order.findMany({
    where: {
      organizationId: tenantId,
      tableId: { in: tableIds },
      type: 'dine_in',
      status: { in: [...ACTIVE_ORDER_STATUSES, ...AWAITING_PAYMENT_STATUSES] },
    },
    select: { id: true, tableId: true, status: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const ordersByTable = new Map<string, ActiveOrderInfo[]>();
  for (const order of activeOrders) {
    if (!order.tableId) continue;
    const bucket = ordersByTable.get(order.tableId) ?? [];
    bucket.push({ id: order.id, status: order.status });
    ordersByTable.set(order.tableId, bucket);
  }

  const serialized = tables.map((table) => {
    const orders = ordersByTable.get(table.id) ?? [];
    const status = deriveStatus(orders);
    return serializeTable(table, status, pickActiveOrderId(orders));
  });

  if (query.status) {
    return { data: serialized.filter((table) => table.status === query.status) };
  }

  return { data: serialized };
}

export async function createTableHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const body = createTableSchema.parse(request.body);

  const existing = await request.server.prisma.table.findFirst({
    where: { organizationId: tenantId, number: body.number, deletedAt: null },
    select: { id: true },
  });

  if (existing) {
    return reply
      .code(409)
      .send(error('table_already_exists', 'Já existe uma mesa com esse número'));
  }

  const table = await request.server.prisma.table.create({
    data: {
      organizationId: tenantId,
      number: body.number,
      capacity: body.capacity ?? 4,
    },
  });

  return reply.code(201).send({ data: serializeTable(table, 'free', null) });
}

export async function updateTableHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = tableIdParamSchema.parse(request.params);
  const body = updateTableSchema.parse(request.body);

  const table = await request.server.prisma.table.findFirst({
    where: { id, organizationId: tenantId, deletedAt: null },
  });

  if (!table) {
    return reply.code(404).send(error('table_not_found', 'Mesa não encontrada'));
  }

  if (body.number !== undefined && body.number !== table.number) {
    const conflict = await request.server.prisma.table.findFirst({
      where: {
        organizationId: tenantId,
        number: body.number,
        deletedAt: null,
        id: { not: id },
      },
      select: { id: true },
    });

    if (conflict) {
      return reply
        .code(409)
        .send(error('table_already_exists', 'Já existe uma mesa com esse número'));
    }
  }

  const updated = await request.server.prisma.table.update({
    where: { id },
    data: {
      ...(body.number === undefined ? {} : { number: body.number }),
      ...(body.capacity === undefined ? {} : { capacity: body.capacity }),
    },
  });

  const activeOrders = await request.server.prisma.order.findMany({
    where: {
      organizationId: tenantId,
      tableId: id,
      type: 'dine_in',
      status: { in: [...ACTIVE_ORDER_STATUSES, ...AWAITING_PAYMENT_STATUSES] },
    },
    select: { id: true, status: true },
    orderBy: { createdAt: 'asc' },
  });

  return {
    data: serializeTable(updated, deriveStatus(activeOrders), pickActiveOrderId(activeOrders)),
  };
}

export async function deleteTableHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = tableIdParamSchema.parse(request.params);

  const table = await request.server.prisma.table.findFirst({
    where: { id, organizationId: tenantId, deletedAt: null },
    select: { id: true },
  });

  if (!table) {
    return reply.code(404).send(error('table_not_found', 'Mesa não encontrada'));
  }

  const hasActive = await request.server.prisma.order.findFirst({
    where: {
      organizationId: tenantId,
      tableId: id,
      status: { in: [...ACTIVE_ORDER_STATUSES, ...AWAITING_PAYMENT_STATUSES] },
    },
    select: { id: true },
  });

  if (hasActive) {
    return reply.code(409).send(error('table_has_active_order', 'Mesa possui pedido em aberto'));
  }

  const deleted = await request.server.prisma.table.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return { data: serializeTable(deleted, 'free', null) };
}
