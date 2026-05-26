'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { cashRegisterKeys } from '@/features/caixa/api/keys';
import { tableKeys } from '@/features/mesas/api/keys';
import { orderKeys } from '@/features/pedidos/api/keys';

type RealtimeEvent = {
  type: string;
  payload?: {
    id?: string;
    orderId?: string | null;
  };
};

function realtimeUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';
  const url = new URL('/api/v1/realtime', baseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

export function RealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let closed = false;
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function invalidateOrderState(event: RealtimeEvent) {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: tableKeys.all });

      if (event.type === 'order_status_changed' || event.type === 'order_cancelled') {
        queryClient.invalidateQueries({ queryKey: cashRegisterKeys.all });
      }

      const orderId = event.payload?.id ?? event.payload?.orderId;
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      }
    }

    function connect() {
      socket = new WebSocket(realtimeUrl());

      socket.addEventListener('message', (message) => {
        try {
          const event = JSON.parse(message.data) as RealtimeEvent;
          if (
            event.type === 'order_created' ||
            event.type === 'order_status_changed' ||
            event.type === 'order_cancelled'
          ) {
            invalidateOrderState(event);
          }
        } catch {
          // Ignore malformed realtime messages.
        }
      });

      socket.addEventListener('close', () => {
        if (closed) return;
        retryTimer = setTimeout(connect, 3000);
      });
    }

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, [queryClient]);

  return null;
}
