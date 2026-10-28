import type { Prisma } from '@cafe/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  listPrintJobsQuerySchema,
  printJobIdParamSchema,
  updatePrintJobStatusSchema,
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

type PrintJobRecord = Prisma.PrintJobGetPayload<true>;

function serializePrintJob(job: PrintJobRecord) {
  return {
    id: job.id,
    organizationId: job.organizationId,
    orderId: job.orderId,
    type: job.type,
    status: job.status,
    attempts: job.attempts,
    payload: job.payload,
    errorMessage: job.errorMessage,
    printedAt: job.printedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

export async function listPrintJobsHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const query = listPrintJobsQuerySchema.parse(request.query);

  const jobs = await request.withTenant((db) =>
    db.printJob.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.orderId ? { orderId: query.orderId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: query.limit ?? 100,
    }),
  );

  return { data: jobs.map(serializePrintJob) };
}

export async function getPrintJobHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = printJobIdParamSchema.parse(request.params);

  const job = await request.withTenant((db) => db.printJob.findFirst({ where: { id } }));
  if (!job) {
    return reply.code(404).send(error('print_job_not_found', 'Job de impressão não encontrado'));
  }

  return { data: serializePrintJob(job) };
}

export async function retryPrintJobHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = printJobIdParamSchema.parse(request.params);

  const result = await request.withTenant(async (db) => {
    const job = await db.printJob.findFirst({ where: { id } });
    if (!job) return { kind: 'not_found' as const };
    if (job.status === 'printed') return { kind: 'already_printed' as const };

    const updated = await db.printJob.update({
      where: { id },
      data: {
        status: 'queued',
        errorMessage: null,
      },
    });

    return { kind: 'ok' as const, updated };
  });

  if (result.kind === 'not_found') {
    return reply.code(404).send(error('print_job_not_found', 'Job de impressão não encontrado'));
  }
  if (result.kind === 'already_printed') {
    return reply
      .code(409)
      .send(error('print_job_already_printed', 'Job já foi impresso com sucesso'));
  }

  request.server.realtime.publish(tenantId, {
    type: 'print_job_queued',
    payload: serializePrintJob(result.updated),
  });

  return { data: serializePrintJob(result.updated) };
}

export async function updatePrintJobStatusHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = printJobIdParamSchema.parse(request.params);
  const body = updatePrintJobStatusSchema.parse(request.body);

  const result = await request.withTenant(async (db) => {
    const job = await db.printJob.findFirst({ where: { id } });
    if (!job) return { kind: 'not_found' as const };

    const data: Prisma.PrintJobUpdateInput = {
      status: body.status,
      ...(body.status === 'sent' || body.status === 'failed' ? { attempts: { increment: 1 } } : {}),
      ...(body.status === 'printed' ? { printedAt: new Date(), errorMessage: null } : {}),
      ...(body.status === 'failed' ? { errorMessage: body.errorMessage ?? null } : {}),
    };

    const updated = await db.printJob.update({
      where: { id },
      data,
    });

    return { kind: 'ok' as const, updated };
  });

  if (result.kind === 'not_found') {
    return reply.code(404).send(error('print_job_not_found', 'Job de impressão não encontrado'));
  }

  return { data: serializePrintJob(result.updated) };
}
