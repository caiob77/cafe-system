import { Prisma } from '@cafe/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { type CashRegisterRecord, buildSummary, serializeCashRegister } from './helpers.js';
import {
  cashMovementSchema,
  cashRegisterIdParamSchema,
  closeCashRegisterSchema,
  openCashRegisterSchema,
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

function userIdOrReply(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.authSession?.user.id;
  if (!userId) {
    void reply.code(401).send(error('unauthorized', 'Sessão obrigatória'));
    return null;
  }
  return userId;
}

const REGISTER_INCLUDE = {
  movements: true,
} as const;

async function findOpenRegisterForTenant(
  request: FastifyRequest,
  tenantId: string,
): Promise<CashRegisterRecord | null> {
  return request.server.prisma.cashRegister.findFirst({
    where: { organizationId: tenantId, closedAt: null },
    include: REGISTER_INCLUDE,
  });
}

async function findRegisterForTenant(
  request: FastifyRequest,
  tenantId: string,
  id: string,
): Promise<CashRegisterRecord | null> {
  return request.server.prisma.cashRegister.findFirst({
    where: { id, organizationId: tenantId },
    include: REGISTER_INCLUDE,
  });
}

export async function getCurrentCashRegisterHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const register = await findOpenRegisterForTenant(request, tenantId);
  if (!register) {
    return { data: null };
  }

  const summary = await buildSummary(request.server.prisma, register);
  return { data: serializeCashRegister(register, summary) };
}

export async function getCashRegisterHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = cashRegisterIdParamSchema.parse(request.params);

  const register = await findRegisterForTenant(request, tenantId, id);
  if (!register) {
    return reply.code(404).send(error('cash_register_not_found', 'Caixa não encontrado'));
  }

  const summary = await buildSummary(request.server.prisma, register);
  return { data: serializeCashRegister(register, summary) };
}

export async function openCashRegisterHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const userId = userIdOrReply(request, reply);
  if (!userId) return reply;

  const body = openCashRegisterSchema.parse(request.body);

  try {
    const register = await request.server.prisma.cashRegister.create({
      data: {
        organizationId: tenantId,
        openedById: userId,
        initialAmount: new Prisma.Decimal(body.initialAmount),
        notes: body.notes ?? null,
      },
      include: REGISTER_INCLUDE,
    });

    const summary = await buildSummary(request.server.prisma, register);
    return reply.code(201).send({ data: serializeCashRegister(register, summary) });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const open = await findOpenRegisterForTenant(request, tenantId);
      if (open) {
        const summary = await buildSummary(request.server.prisma, open);
        return reply.code(409).send({
          error: {
            code: 'cash_register_already_open',
            message: 'Já existe um caixa aberto',
          },
          data: serializeCashRegister(open, summary),
        });
      }
    }
    throw err;
  }
}

export async function closeCashRegisterHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const userId = userIdOrReply(request, reply);
  if (!userId) return reply;

  const body = closeCashRegisterSchema.parse(request.body);

  const register = await findOpenRegisterForTenant(request, tenantId);
  if (!register) {
    return reply.code(404).send(error('cash_register_not_open', 'Não há caixa aberto'));
  }

  if (register.version !== body.version) {
    return reply
      .code(409)
      .send(error('cash_register_version_mismatch', 'Caixa foi atualizado por outro usuário'));
  }

  const summaryBeforeClose = await buildSummary(request.server.prisma, register);
  const expected = new Prisma.Decimal(summaryBeforeClose.cashFlow.expected);
  const finalAmount = body.finalAmount !== undefined ? new Prisma.Decimal(body.finalAmount) : null;
  const difference = finalAmount !== null ? finalAmount.sub(expected) : null;

  const updated = await request.server.prisma.cashRegister.update({
    where: { id: register.id, version: register.version },
    data: {
      closedAt: new Date(),
      closedById: userId,
      finalAmount,
      expectedAmount: expected,
      difference,
      notes: body.notes ?? register.notes,
      version: { increment: 1 },
    },
    include: REGISTER_INCLUDE,
  });

  const summary = await buildSummary(request.server.prisma, updated);
  return { data: serializeCashRegister(updated, summary) };
}

export async function createCashMovementHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const userId = userIdOrReply(request, reply);
  if (!userId) return reply;

  const { id } = cashRegisterIdParamSchema.parse(request.params);
  const body = cashMovementSchema.parse(request.body);

  const register = await findRegisterForTenant(request, tenantId, id);
  if (!register) {
    return reply.code(404).send(error('cash_register_not_found', 'Caixa não encontrado'));
  }
  if (register.closedAt !== null) {
    return reply.code(409).send(error('cash_register_closed', 'Caixa está fechado'));
  }

  await request.server.prisma.cashMovement.create({
    data: {
      organizationId: tenantId,
      cashRegisterId: register.id,
      type: body.type,
      amount: new Prisma.Decimal(body.amount),
      reason: body.reason,
      createdById: userId,
    },
  });

  const refreshed = await findRegisterForTenant(request, tenantId, id);
  if (!refreshed) {
    return reply.code(500).send(error('cash_register_lookup_failed', 'Falha ao recarregar caixa'));
  }
  const summary = await buildSummary(request.server.prisma, refreshed);
  return reply.code(201).send({ data: serializeCashRegister(refreshed, summary) });
}
