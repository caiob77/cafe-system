import { Prisma, hashPassword } from '@cafe/db';
import {
  createMemberSchema,
  memberEmail,
  memberIdParamSchema,
  memberLogin,
  parseMemberEmail,
  updateMemberAccessSchema,
} from '@cafe/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { checkMemberLimit } from '../../lib/plan-limits.js';

function error(code: string, message: string) {
  return { error: { code, message } };
}

/** Conta criada pelo dono deste café (`usuario@<id-do-cafe>.membros...`). */
function ownedByCafe(email: string, organizationId: string) {
  return parseMemberEmail(email)?.scope === organizationId.toLowerCase();
}

export async function createMemberHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = request.tenantId;
  if (!tenantId) {
    return reply.code(403).send(error('tenant_required', 'Organização ativa obrigatória'));
  }

  const body = createMemberSchema.parse(request.body);
  const prisma = request.server.prisma;

  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { slug: true, plan: true },
  });
  if (!org) {
    return reply.code(404).send(error('organization_not_found', 'Organização não encontrada'));
  }

  const members = await prisma.member.count({ where: { organizationId: tenantId } });
  const limit = checkMemberLimit(org.plan, members);
  if (!limit.ok) {
    return reply.code(402).send(error(limit.code, limit.message));
  }

  const email = memberEmail(body.username, tenantId);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return reply
      .code(409)
      .send(error('username_taken', `O usuário "${body.username}" já existe neste café`));
  }

  try {
    const member = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name: body.name, emailVerified: true },
      });
      await tx.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: 'credential',
          password: hashPassword(body.password),
        },
      });
      return tx.member.create({
        data: { organizationId: tenantId, userId: user.id, role: body.role },
        include: { user: { select: { name: true, email: true } } },
      });
    });

    return reply.code(201).send({
      data: {
        id: member.id,
        userId: member.userId,
        role: member.role,
        user: { name: member.user.name, email: member.user.email },
        login: memberLogin(body.username, org.slug),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return reply
        .code(409)
        .send(error('username_taken', `O usuário "${body.username}" já existe neste café`));
    }
    throw err;
  }
}

export async function updateMemberAccessHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = request.tenantId;
  if (!tenantId) {
    return reply.code(403).send(error('tenant_required', 'Organização ativa obrigatória'));
  }

  const { memberId } = memberIdParamSchema.parse(request.params);
  const body = updateMemberAccessSchema.parse(request.body);
  const prisma = request.server.prisma;

  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId: tenantId },
    include: { user: { select: { email: true } } },
  });
  if (!member) {
    return reply.code(404).send(error('member_not_found', 'Membro não encontrado'));
  }

  // Quem entra com e-mail próprio cuida da própria senha.
  const current = parseMemberEmail(member.user.email);
  if (!current || !ownedByCafe(member.user.email, tenantId)) {
    return reply
      .code(409)
      .send(
        error('member_not_managed', 'Este membro entra com e-mail próprio e gerencia o acesso'),
      );
  }

  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });
  if (!org) {
    return reply.code(404).send(error('organization_not_found', 'Organização não encontrada'));
  }

  const username = body.username ?? current.username;
  const email = memberEmail(username, tenantId);
  const emailChanged = email !== member.user.email;

  if (emailChanged) {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return reply
        .code(409)
        .send(error('username_taken', `O usuário "${username}" já existe neste café`));
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (emailChanged) {
        await tx.user.update({ where: { id: member.userId }, data: { email } });
      }
      if (body.password) {
        const password = hashPassword(body.password);
        const updated = await tx.account.updateMany({
          where: { userId: member.userId, providerId: 'credential' },
          data: { password },
        });
        if (updated.count === 0) {
          await tx.account.create({
            data: {
              userId: member.userId,
              accountId: member.userId,
              providerId: 'credential',
              password,
            },
          });
        }
        // Senha trocada derruba sessões abertas (ex.: aparelho perdido).
        await tx.session.deleteMany({ where: { userId: member.userId } });
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return reply
        .code(409)
        .send(error('username_taken', `O usuário "${username}" já existe neste café`));
    }
    throw err;
  }

  return { data: { id: member.id, login: memberLogin(username, org.slug) } };
}

export async function removeMemberHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = request.tenantId;
  if (!tenantId) {
    return reply.code(403).send(error('tenant_required', 'Organização ativa obrigatória'));
  }

  const { memberId } = memberIdParamSchema.parse(request.params);
  const prisma = request.server.prisma;

  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId: tenantId },
    include: { user: { select: { email: true, name: true } } },
  });
  if (!member) {
    return reply.code(404).send(error('member_not_found', 'Membro não encontrado'));
  }
  if (member.role === 'owner') {
    return reply.code(409).send(error('member_is_owner', 'O proprietário não pode ser removido'));
  }
  if (member.userId === request.authSession?.user.id) {
    return reply.code(409).send(error('member_is_self', 'Você não pode remover a si mesmo'));
  }

  // Quem entra com e-mail próprio só perde o vínculo; a conta é da pessoa.
  if (!ownedByCafe(member.user.email, tenantId)) {
    await prisma.member.delete({ where: { id: member.id } });
    return { data: { id: member.id } };
  }

  // Conta criada pelo dono só existe para este café: é apagada (vínculo, senha e sessões
  // vão em cascata). Caixa e pedidos perdem o id e guardam o nome.
  const userId = member.userId;
  const name = member.user.name;
  await request.withTenant(async (tx) => {
    await tx.cashRegister.updateMany({
      where: { openedById: userId },
      data: { openedByName: name },
    });
    await tx.cashRegister.updateMany({
      where: { closedById: userId },
      data: { closedByName: name },
    });
    await tx.cashMovement.updateMany({
      where: { createdById: userId },
      data: { createdByName: name },
    });
    await tx.order.updateMany({
      where: { cancelledById: userId },
      data: { cancelledByName: name },
    });
    await tx.user.delete({ where: { id: userId } });
  });

  return { data: { id: member.id } };
}
