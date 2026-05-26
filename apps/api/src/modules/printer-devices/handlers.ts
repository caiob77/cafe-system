import type { Prisma } from '@cafe/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { generatePrinterToken, hashPrinterToken } from '../../lib/printer-token.js';
import { createPrinterDeviceSchema, printerDeviceIdParamSchema } from './schemas.js';

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

type PrinterDeviceRecord = Prisma.PrinterDeviceGetPayload<true>;

function serializeDevice(device: PrinterDeviceRecord) {
  return {
    id: device.id,
    organizationId: device.organizationId,
    name: device.name,
    lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
    revokedAt: device.revokedAt?.toISOString() ?? null,
    createdAt: device.createdAt.toISOString(),
    updatedAt: device.updatedAt.toISOString(),
  };
}

export async function listPrinterDevicesHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const devices = await request.server.prisma.printerDevice.findMany({
    where: { organizationId: tenantId },
    orderBy: { createdAt: 'asc' },
  });

  return { data: devices.map(serializeDevice) };
}

export async function createPrinterDeviceHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const body = createPrinterDeviceSchema.parse(request.body);
  const token = generatePrinterToken();

  const device = await request.server.prisma.printerDevice.create({
    data: {
      organizationId: tenantId,
      name: body.name,
      tokenHash: hashPrinterToken(token),
    },
  });

  return reply.code(201).send({
    data: { ...serializeDevice(device), token },
  });
}

export async function revokePrinterDeviceHandler(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = tenantIdOrReply(request, reply);
  if (!tenantId) return reply;

  const { id } = printerDeviceIdParamSchema.parse(request.params);

  const device = await request.server.prisma.printerDevice.findFirst({
    where: { id, organizationId: tenantId },
  });
  if (!device) {
    return reply.code(404).send(error('printer_device_not_found', 'Impressora não encontrada'));
  }
  if (device.revokedAt) {
    return reply.code(409).send(error('printer_device_already_revoked', 'Impressora já revogada'));
  }

  const updated = await request.server.prisma.printerDevice.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  return { data: serializeDevice(updated) };
}
