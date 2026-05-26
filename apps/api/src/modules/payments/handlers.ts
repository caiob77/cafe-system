import { randomUUID } from 'node:crypto';

import { Prisma } from '@cafe/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { buildPaymentReceipt } from '../print-jobs/builders.js';
import { createPaymentSchema, orderPaymentsParamSchema } from './schemas.js';

const ZERO = new Prisma.Decimal(0);

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

type PaymentRecord = Prisma.PaymentGetPayload<true>;

function serializePayment(payment: PaymentRecord) {
  return {
    id: payment.id,
    organizationId: payment.organizationId,
    orderId: payment.orderId,
    cashRegisterId: payment.cashRegisterId,
    idempotencyKey: payment.idempotencyKey,
    method: payment.method,
    amount: payment.amount.toFixed(2),
    changeAmount: payment.changeAmount === null ? null : payment.changeAmount.toFixed(2),
    createdAt: payment.createdAt.toISOString(),
  };
}

export async function listOrderPaymentsHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = orderPaymentsParamSchema.parse(request.params);

  const order = await request.server.prisma.order.findFirst({
    where: { id, organizationId: tenantId },
    select: { id: true, total: true },
  });

  if (!order) {
    return reply.code(404).send(error('order_not_found', 'Pedido não encontrado'));
  }

  const payments = await request.server.prisma.payment.findMany({
    where: { orderId: id, organizationId: tenantId },
    orderBy: { createdAt: 'asc' },
  });

  const paid = payments.reduce((acc, payment) => acc.add(payment.amount), ZERO);
  const remaining = order.total.sub(paid);

  return {
    data: {
      orderId: order.id,
      total: order.total.toFixed(2),
      paid: paid.toFixed(2),
      remaining: (remaining.gt(ZERO) ? remaining : ZERO).toFixed(2),
      isSettled: paid.gte(order.total),
      payments: payments.map(serializePayment),
    },
  };
}

export async function createOrderPaymentHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id: orderId } = orderPaymentsParamSchema.parse(request.params);
  const body = createPaymentSchema.parse(request.body);
  const idempotencyKey = body.idempotencyKey ?? randomUUID();

  const existingByKey = await request.server.prisma.payment.findUnique({
    where: { idempotencyKey },
  });
  if (existingByKey) {
    if (existingByKey.organizationId !== tenantId || existingByKey.orderId !== orderId) {
      return reply.code(409).send(error('idempotency_conflict', 'idempotencyKey já utilizado'));
    }
    return reply.code(200).send({ data: serializePayment(existingByKey) });
  }

  const openRegister = await request.server.prisma.cashRegister.findFirst({
    where: { organizationId: tenantId, closedAt: null },
    select: { id: true },
  });
  if (!openRegister) {
    return reply
      .code(409)
      .send(error('cash_register_not_open', 'Abra o caixa antes de registrar pagamentos'));
  }

  const amount = new Prisma.Decimal(body.amount);
  const amountReceived =
    body.amountReceived !== undefined ? new Prisma.Decimal(body.amountReceived) : null;
  const changeAmount =
    body.method === 'cash' && amountReceived !== null && amountReceived.gt(amount)
      ? amountReceived.sub(amount)
      : null;

  try {
    const result = await request.server.prisma.$transaction(async (tx) => {
      await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "order"
        WHERE id = ${orderId} AND "organizationId" = ${tenantId}
        FOR UPDATE
      `;

      const order = await tx.order.findFirst({
        where: { id: orderId, organizationId: tenantId },
      });
      if (!order) {
        return { kind: 'order_not_found' as const };
      }
      if (order.status === 'finished') {
        return { kind: 'order_finished' as const };
      }
      if (order.status === 'cancelled') {
        return { kind: 'order_cancelled' as const };
      }

      const previousPayments = await tx.payment.aggregate({
        where: { orderId, organizationId: tenantId },
        _sum: { amount: true },
      });
      const previousPaid = previousPayments._sum.amount ?? ZERO;
      const remaining = order.total.sub(previousPaid);

      if (remaining.lte(ZERO)) {
        return { kind: 'order_already_settled' as const };
      }
      if (amount.gt(remaining)) {
        return { kind: 'amount_exceeds_remaining' as const, remaining };
      }

      const payment = await tx.payment.create({
        data: {
          organizationId: tenantId,
          orderId,
          cashRegisterId: openRegister.id,
          idempotencyKey,
          method: body.method,
          amount,
          changeAmount,
        },
      });

      const newPaid = previousPaid.add(amount);
      const isSettled = newPaid.gte(order.total);
      let updatedOrder = order;
      if (isSettled) {
        updatedOrder = await tx.order.update({
          where: { id: orderId, version: order.version },
          data: {
            status: 'finished',
            finishedAt: new Date(),
            version: { increment: 1 },
          },
        });
      }

      return {
        kind: 'ok' as const,
        payment,
        order: updatedOrder,
        paid: newPaid,
      };
    });

    if (result.kind === 'order_not_found') {
      return reply.code(404).send(error('order_not_found', 'Pedido não encontrado'));
    }
    if (result.kind === 'order_finished') {
      return reply.code(409).send(error('order_already_settled', 'Pedido já está finalizado'));
    }
    if (result.kind === 'order_cancelled') {
      return reply.code(409).send(error('order_cancelled', 'Pedido foi cancelado'));
    }
    if (result.kind === 'order_already_settled') {
      return reply.code(409).send(error('order_already_settled', 'Pedido já está totalmente pago'));
    }
    if (result.kind === 'amount_exceeds_remaining') {
      return reply
        .code(422)
        .send(
          error(
            'amount_exceeds_remaining',
            `Valor excede o saldo a pagar (restante: R$ ${result.remaining.toFixed(2)})`,
          ),
        );
    }

    const remaining = result.order.total.sub(result.paid);

    if (result.order.status === 'finished') {
      const [fullOrder, allPayments, org] = await Promise.all([
        request.server.prisma.order.findUnique({
          where: { id: result.order.id },
          include: {
            items: { include: { addons: true } },
            table: true,
            customer: true,
          },
        }),
        request.server.prisma.payment.findMany({
          where: { orderId: result.order.id, organizationId: tenantId },
          orderBy: { createdAt: 'asc' },
        }),
        request.server.prisma.organization.findUnique({
          where: { id: tenantId },
          select: { name: true },
        }),
      ]);
      if (fullOrder && org) {
        const receiptJob = await request.server.prisma.printJob.create({
          data: {
            organizationId: tenantId,
            orderId: fullOrder.id,
            type: 'payment_receipt',
            payload: buildPaymentReceipt(fullOrder, allPayments, org.name),
          },
        });
        request.server.realtime.publish(tenantId, {
          type: 'print_job_queued',
          payload: {
            id: receiptJob.id,
            organizationId: receiptJob.organizationId,
            orderId: receiptJob.orderId,
            type: receiptJob.type,
            status: receiptJob.status,
          },
        });
      }
    }

    return reply.code(201).send({
      data: {
        payment: serializePayment(result.payment),
        order: {
          id: result.order.id,
          status: result.order.status,
          total: result.order.total.toFixed(2),
          paid: result.paid.toFixed(2),
          remaining: (remaining.gt(ZERO) ? remaining : ZERO).toFixed(2),
          isSettled: result.paid.gte(result.order.total),
          version: result.order.version,
          finishedAt: result.order.finishedAt?.toISOString() ?? null,
        },
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const conflict = await request.server.prisma.payment.findUnique({
        where: { idempotencyKey },
      });
      if (conflict && conflict.orderId === orderId && conflict.organizationId === tenantId) {
        return reply.code(200).send({ data: serializePayment(conflict) });
      }
      return reply.code(409).send(error('idempotency_conflict', 'idempotencyKey já utilizado'));
    }
    throw err;
  }
}
