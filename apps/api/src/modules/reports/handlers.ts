import { Prisma } from '@cafe/db';
import type { PaymentMethodValue } from '@cafe/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  paymentsReportQuerySchema,
  productsReportQuerySchema,
  salesReportQuerySchema,
  summaryReportQuerySchema,
} from './schemas.js';

const ZERO = new Prisma.Decimal(0);
const DEFAULT_WINDOW_DAYS = 30;

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

function resolveRange(input: { dateFrom?: string; dateTo?: string }): {
  from: Date;
  to: Date;
} {
  const to = input.dateTo ? new Date(input.dateTo) : new Date();
  const from = input.dateFrom
    ? new Date(input.dateFrom)
    : new Date(to.getTime() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return { from, to };
}

function toDecimalString(value: unknown): string {
  if (value === null || value === undefined) return '0.00';
  if (value instanceof Prisma.Decimal) return value.toFixed(2);
  if (typeof value === 'string') return new Prisma.Decimal(value).toFixed(2);
  if (typeof value === 'number') return new Prisma.Decimal(value).toFixed(2);
  return '0.00';
}

export async function salesReportHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const query = salesReportQuerySchema.parse(request.query);
  const { from, to } = resolveRange(query);

  type Row = { bucket: Date; count: bigint; revenue: Prisma.Decimal | null };
  const rows = await request.server.prisma.$queryRaw<Row[]>`
    SELECT
      DATE_TRUNC(${query.period}, "createdAt" AT TIME ZONE 'America/Sao_Paulo') AS bucket,
      COUNT(*) AS count,
      SUM(total) AS revenue
    FROM "order"
    WHERE "organizationId" = ${tenantId}
      AND status = 'finished'
      AND "createdAt" >= ${from}
      AND "createdAt" <= ${to}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  const totalRevenue = rows.reduce((acc, row) => acc.add(row.revenue ?? ZERO), ZERO);
  const totalCount = rows.reduce((acc, row) => acc + Number(row.count), 0);

  return {
    data: {
      period: query.period,
      from: from.toISOString(),
      to: to.toISOString(),
      buckets: rows.map((row) => ({
        bucket: row.bucket.toISOString(),
        count: Number(row.count),
        revenue: toDecimalString(row.revenue),
      })),
      totals: {
        count: totalCount,
        revenue: totalRevenue.toFixed(2),
      },
    },
  };
}

export async function productsReportHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const query = productsReportQuerySchema.parse(request.query);
  const { from, to } = resolveRange(query);

  type Row = {
    productId: string;
    name: string;
    quantity: bigint;
    revenue: Prisma.Decimal | null;
  };
  const rows = await request.server.prisma.$queryRaw<Row[]>`
    SELECT
      oi."productId"           AS "productId",
      oi."productNameSnapshot" AS name,
      SUM(oi.quantity)         AS quantity,
      SUM(oi."unitPrice" * oi.quantity) AS revenue
    FROM "order_item" oi
    JOIN "order" o ON o.id = oi."orderId"
    WHERE oi."organizationId" = ${tenantId}
      AND o.status = 'finished'
      AND o."createdAt" >= ${from}
      AND o."createdAt" <= ${to}
    GROUP BY oi."productId", oi."productNameSnapshot"
    ORDER BY quantity DESC, revenue DESC
    LIMIT ${query.limit}
  `;

  return {
    data: {
      from: from.toISOString(),
      to: to.toISOString(),
      items: rows.map((row) => ({
        productId: row.productId,
        name: row.name,
        quantity: Number(row.quantity),
        revenue: toDecimalString(row.revenue),
      })),
    },
  };
}

export async function paymentsReportHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const query = paymentsReportQuerySchema.parse(request.query);
  const { from, to } = resolveRange(query);

  const grouped = await request.server.prisma.payment.groupBy({
    by: ['method'],
    where: {
      organizationId: tenantId,
      createdAt: { gte: from, lte: to },
    },
    _sum: { amount: true },
    _count: { _all: true },
  });

  const methods: PaymentMethodValue[] = ['cash', 'credit_card', 'debit_card', 'pix'];
  const byMethod = methods.reduce<Record<string, { amount: string; count: number }>>(
    (acc, method) => {
      acc[method] = { amount: '0.00', count: 0 };
      return acc;
    },
    {},
  );

  let totalAmount = ZERO;
  let totalCount = 0;
  for (const row of grouped) {
    const amount = row._sum.amount ?? ZERO;
    byMethod[row.method as PaymentMethodValue] = {
      amount: amount.toFixed(2),
      count: row._count._all,
    };
    totalAmount = totalAmount.add(amount);
    totalCount += row._count._all;
  }

  return {
    data: {
      from: from.toISOString(),
      to: to.toISOString(),
      byMethod,
      totals: {
        amount: totalAmount.toFixed(2),
        count: totalCount,
      },
    },
  };
}

export async function summaryReportHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const query = summaryReportQuerySchema.parse(request.query);
  const { from, to } = resolveRange(query);

  const dateFilter = { createdAt: { gte: from, lte: to } };

  const [finishedAgg, cancelledCount, itemsAgg] = await Promise.all([
    request.server.prisma.order.aggregate({
      where: { organizationId: tenantId, status: 'finished', ...dateFilter },
      _count: { _all: true },
      _sum: { total: true },
    }),
    request.server.prisma.order.count({
      where: { organizationId: tenantId, status: 'cancelled', ...dateFilter },
    }),
    request.server.prisma.orderItem.aggregate({
      where: {
        organizationId: tenantId,
        order: { status: 'finished', ...dateFilter },
      },
      _sum: { quantity: true },
    }),
  ]);

  const finishedCount = finishedAgg._count._all;
  const revenue = finishedAgg._sum.total ?? ZERO;
  const averageTicket = finishedCount > 0 ? revenue.div(finishedCount) : ZERO;

  return {
    data: {
      from: from.toISOString(),
      to: to.toISOString(),
      finishedOrders: finishedCount,
      cancelledOrders: cancelledCount,
      revenue: revenue.toFixed(2),
      averageTicket: averageTicket.toFixed(2),
      itemsSold: itemsAgg._sum.quantity ?? 0,
    },
  };
}
