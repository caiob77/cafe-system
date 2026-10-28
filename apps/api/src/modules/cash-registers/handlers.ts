import { Prisma, type TenantTx } from '@cafe/db';
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

async function findOpenRegisterForTenant(db: TenantTx): Promise<CashRegisterRecord | null> {
  return db.cashRegister.findFirst({
    where: { closedAt: null },
    include: REGISTER_INCLUDE,
  });
}

async function findRegisterForTenant(db: TenantTx, id: string): Promise<CashRegisterRecord | null> {
  return db.cashRegister.findFirst({
    where: { id },
    include: REGISTER_INCLUDE,
  });
}

export async function getCurrentCashRegisterHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const data = await request.withTenant(async (db) => {
    const register = await findOpenRegisterForTenant(db);
    if (!register) return null;

    const summary = await buildSummary(db, register);
    return serializeCashRegister(register, summary);
  });

  return { data };
}

export async function getCashRegisterHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = cashRegisterIdParamSchema.parse(request.params);

  const data = await request.withTenant(async (db) => {
    const register = await findRegisterForTenant(db, id);
    if (!register) return null;

    const summary = await buildSummary(db, register);
    return serializeCashRegister(register, summary);
  });

  if (!data) {
    return reply.code(404).send(error('cash_register_not_found', 'Caixa não encontrado'));
  }

  return { data };
}

export async function openCashRegisterHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const userId = userIdOrReply(request, reply);
  if (!userId) return reply;

  const body = openCashRegisterSchema.parse(request.body);

  try {
    const data = await request.withTenant(async (db) => {
      const register = await db.cashRegister.create({
        data: {
          organizationId: tenantId,
          openedById: userId,
          initialAmount: new Prisma.Decimal(body.initialAmount),
          notes: body.notes ?? null,
        },
        include: REGISTER_INCLUDE,
      });

      const summary = await buildSummary(db, register);
      return serializeCashRegister(register, summary);
    });
    return reply.code(201).send({ data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const openData = await request.withTenant(async (db) => {
        const open = await findOpenRegisterForTenant(db);
        if (!open) return null;
        const summary = await buildSummary(db, open);
        return serializeCashRegister(open, summary);
      });
      if (openData) {
        return reply.code(409).send({
          error: {
            code: 'cash_register_already_open',
            message: 'Já existe um caixa aberto',
          },
          data: openData,
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

  const result = await request.withTenant(async (db) => {
    const register = await findOpenRegisterForTenant(db);
    if (!register) return { kind: 'not_found' as const };

    if (register.version !== body.version) {
      return { kind: 'version_mismatch' as const };
    }

    const summaryBeforeClose = await buildSummary(db, register);
    const expected = new Prisma.Decimal(summaryBeforeClose.cashFlow.expected);
    const finalAmount =
      body.finalAmount !== undefined ? new Prisma.Decimal(body.finalAmount) : null;
    const difference = finalAmount !== null ? finalAmount.sub(expected) : null;

    const updated = await db.cashRegister.update({
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

    const summary = await buildSummary(db, updated);
    return { kind: 'ok' as const, data: serializeCashRegister(updated, summary) };
  });

  if (result.kind === 'not_found') {
    return reply.code(404).send(error('cash_register_not_open', 'Não há caixa aberto'));
  }

  if (result.kind === 'version_mismatch') {
    return reply
      .code(409)
      .send(error('cash_register_version_mismatch', 'Caixa foi atualizado por outro usuário'));
  }

  return { data: result.data };
}

export async function createCashMovementHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const userId = userIdOrReply(request, reply);
  if (!userId) return reply;

  const { id } = cashRegisterIdParamSchema.parse(request.params);
  const body = cashMovementSchema.parse(request.body);

  const result = await request.withTenant(async (db) => {
    const register = await findRegisterForTenant(db, id);
    if (!register) return { kind: 'not_found' as const };
    if (register.closedAt !== null) return { kind: 'closed' as const };

    await db.cashMovement.create({
      data: {
        organizationId: tenantId,
        cashRegisterId: register.id,
        type: body.type,
        amount: new Prisma.Decimal(body.amount),
        reason: body.reason,
        createdById: userId,
      },
    });

    const refreshed = await findRegisterForTenant(db, id);
    if (!refreshed) return { kind: 'lookup_failed' as const };
    const summary = await buildSummary(db, refreshed);
    return { kind: 'ok' as const, data: serializeCashRegister(refreshed, summary) };
  });

  if (result.kind === 'not_found') {
    return reply.code(404).send(error('cash_register_not_found', 'Caixa não encontrado'));
  }
  if (result.kind === 'closed') {
    return reply.code(409).send(error('cash_register_closed', 'Caixa está fechado'));
  }
  if (result.kind === 'lookup_failed') {
    return reply.code(500).send(error('cash_register_lookup_failed', 'Falha ao recarregar caixa'));
  }

  return reply.code(201).send({ data: result.data });
}
