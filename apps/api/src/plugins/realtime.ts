import websocket, { type WebSocket } from '@fastify/websocket';
import fp from 'fastify-plugin';

export type RealtimeEvent =
  | { type: 'order_created'; payload: Record<string, unknown> }
  | { type: 'order_status_changed'; payload: Record<string, unknown> }
  | { type: 'order_cancelled'; payload: Record<string, unknown> }
  | { type: 'print_job_queued'; payload: Record<string, unknown> };

declare module 'fastify' {
  interface FastifyInstance {
    realtime: {
      publish: (tenantId: string, event: RealtimeEvent) => void;
      subscriberCount: (tenantId: string) => number;
    };
  }
}

function error(code: string, message: string) {
  return { error: { code, message } };
}

export const realtimePlugin = fp(
  async (app) => {
    await app.register(websocket, {
      options: { maxPayload: 1_048_576 },
    });

    const channels = new Map<string, Set<WebSocket>>();

    function addSubscriber(tenantId: string, socket: WebSocket): void {
      const bucket = channels.get(tenantId) ?? new Set<WebSocket>();
      bucket.add(socket);
      channels.set(tenantId, bucket);
    }

    function removeSubscriber(tenantId: string, socket: WebSocket): void {
      const bucket = channels.get(tenantId);
      if (!bucket) return;
      bucket.delete(socket);
      if (bucket.size === 0) channels.delete(tenantId);
    }

    app.decorate('realtime', {
      publish(tenantId, event) {
        const bucket = channels.get(tenantId);
        if (!bucket || bucket.size === 0) return;
        const message = JSON.stringify(event);
        for (const socket of bucket) {
          if (socket.readyState === socket.OPEN) {
            try {
              socket.send(message);
            } catch (err) {
              app.log.warn({ err, tenantId, type: event.type }, 'Falha ao enviar evento WS');
            }
          }
        }
      },
      subscriberCount(tenantId) {
        return channels.get(tenantId)?.size ?? 0;
      },
    });

    app.get(
      '/api/v1/realtime',
      {
        websocket: true,
        preHandler: app.requirePrinterOrRole(['owner', 'manager', 'attendant', 'kitchen']),
      },
      (socket, request) => {
        const tenantId = request.tenantId;
        if (!tenantId) {
          socket.close(1008, 'tenant_required');
          return;
        }

        addSubscriber(tenantId, socket);
        socket.send(JSON.stringify({ type: 'connected', tenantId }));

        const heartbeat = setInterval(() => {
          if (socket.readyState === socket.OPEN) socket.ping();
        }, 30_000);

        socket.on('close', () => {
          clearInterval(heartbeat);
          removeSubscriber(tenantId, socket);
        });
        socket.on('error', (err: Error) => {
          request.log.warn({ err, tenantId }, 'Erro em conexão WS');
        });
      },
    );

    app.get(
      '/api/v1/realtime/stats',
      { preHandler: app.requireRole(['owner', 'manager']) },
      async (request, reply) => {
        if (!request.tenantId) {
          return reply.code(403).send(error('tenant_required', 'Organização ativa obrigatória'));
        }
        return { data: { subscribers: app.realtime.subscriberCount(request.tenantId) } };
      },
    );
  },
  {
    name: 'realtime',
    dependencies: ['auth'],
  },
);
