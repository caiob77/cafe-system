// Print-agent placeholder.
// Quando você ligar uma impressora térmica, substitua `simulatePrint` pela
// chamada real de node-thermal-printer (formatando o payload em ESC/POS).

import type { KitchenTicketPayload, PrintJobPayload, ReceiptPayload } from '@cafe/shared';
import WebSocket from 'ws';

type Env = {
  apiBaseUrl: string;
  apiWsUrl: string;
  printerToken: string;
};

function assertProductionTransport(apiBaseUrl: string, apiWsUrl: string): void {
  if (process.env.NODE_ENV !== 'production') return;

  const apiUrl = new URL(apiBaseUrl);
  const wsUrl = new URL(apiWsUrl);

  if (apiUrl.protocol !== 'https:' || wsUrl.protocol !== 'wss:') {
    throw new Error('Em produção, configure API_BASE_URL com https:// e API_WS_URL com wss://.');
  }
}

function loadEnv(): Env {
  const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3333';
  const apiWsUrl = process.env.API_WS_URL ?? 'ws://localhost:3333/api/v1/realtime';
  const printerToken = process.env.PRINTER_TOKEN;
  if (!printerToken || printerToken.trim().length === 0) {
    throw new Error(
      'PRINTER_TOKEN não configurado. Gere via POST /api/v1/printer-devices ou use o token do seed.',
    );
  }
  assertProductionTransport(apiBaseUrl, apiWsUrl);
  return { apiBaseUrl, apiWsUrl, printerToken };
}

function authHeaders(env: Env): Record<string, string> {
  return { Authorization: `Bearer ${env.printerToken}` };
}

type QueuedEvent = {
  type: 'print_job_queued';
  payload: { id: string; orderId: string | null; type: string; status: string };
};

type PrintJobApi = {
  id: string;
  organizationId: string;
  orderId: string | null;
  type: 'kitchen_ticket' | 'payment_receipt';
  status: 'queued' | 'sent' | 'printed' | 'failed';
  attempts: number;
  payload: PrintJobPayload;
};

async function fetchPrintJob(env: Env, id: string): Promise<PrintJobApi | null> {
  const res = await fetch(`${env.apiBaseUrl}/api/v1/print-jobs/${id}`, {
    headers: authHeaders(env),
  });
  if (!res.ok) {
    console.error(`[print-agent] GET print-job ${id} falhou: ${res.status}`);
    return null;
  }
  const body = (await res.json()) as { data: PrintJobApi };
  return body.data;
}

async function patchStatus(
  env: Env,
  id: string,
  status: 'sent' | 'printed' | 'failed',
  errorMessage?: string,
): Promise<void> {
  const res = await fetch(`${env.apiBaseUrl}/api/v1/print-jobs/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(env),
    },
    body: JSON.stringify({ status, ...(errorMessage ? { errorMessage } : {}) }),
  });
  if (!res.ok) {
    console.error(`[print-agent] PATCH status ${status} falhou para ${id}: ${res.status}`);
  }
}

function formatKitchenTicket(payload: KitchenTicketPayload): string {
  const lines: string[] = [];
  lines.push('================ COMANDA COZINHA ================');
  lines.push(`Pedido #${payload.dailyNumber}  (${payload.orderType.toUpperCase()})`);
  if (payload.tableNumber !== null) lines.push(`Mesa ${payload.tableNumber}`);
  if (payload.customerName !== null) lines.push(`Cliente: ${payload.customerName}`);
  if (payload.deliveryAddress !== null) lines.push(`Endereço: ${payload.deliveryAddress}`);
  lines.push(`Aberto em ${new Date(payload.createdAt).toLocaleString('pt-BR')}`);
  lines.push('-------------------------------------------------');
  for (const item of payload.items) {
    lines.push(`${item.quantity}x ${item.name}`);
    for (const addon of item.addons) {
      lines.push(`   + ${addon.quantity}x ${addon.name}`);
    }
    if (item.notes) lines.push(`   obs: ${item.notes}`);
  }
  if (payload.kitchenNotes) {
    lines.push('-------------------------------------------------');
    lines.push(`COZINHA: ${payload.kitchenNotes}`);
  }
  lines.push('=================================================');
  return lines.join('\n');
}

function formatReceipt(payload: ReceiptPayload): string {
  const lines: string[] = [];
  lines.push('================ CUPOM NÃO FISCAL ===============');
  lines.push(payload.orgName);
  lines.push(`Pedido #${payload.dailyNumber}  (${payload.orderType.toUpperCase()})`);
  lines.push(`Finalizado em ${new Date(payload.finishedAt).toLocaleString('pt-BR')}`);
  lines.push('-------------------------------------------------');
  for (const item of payload.items) {
    lines.push(`${item.quantity}x ${item.name}  R$ ${item.unitPrice}`);
    for (const addon of item.addons) {
      lines.push(`   + ${addon.quantity}x ${addon.name}  R$ ${addon.unitPrice}`);
    }
    lines.push(`   = R$ ${item.lineTotal}`);
  }
  lines.push('-------------------------------------------------');
  lines.push(`Subtotal:  R$ ${payload.subtotal}`);
  if (payload.discountAmount) lines.push(`Desconto:  R$ ${payload.discountAmount}`);
  if (payload.serviceChargeAmount) lines.push(`Serviço:   R$ ${payload.serviceChargeAmount}`);
  if (payload.taxAmount) lines.push(`Imposto:   R$ ${payload.taxAmount}`);
  if (payload.deliveryFee) lines.push(`Entrega:   R$ ${payload.deliveryFee}`);
  lines.push(`TOTAL:     R$ ${payload.total}`);
  lines.push('-------------------------------------------------');
  for (const payment of payload.payments) {
    const change = payment.changeAmount ? ` (troco R$ ${payment.changeAmount})` : '';
    lines.push(`${payment.method.toUpperCase()}: R$ ${payment.amount}${change}`);
  }
  lines.push('=================================================');
  return lines.join('\n');
}

function simulatePrint(payload: PrintJobPayload): void {
  const block =
    payload.kind === 'kitchen_ticket' ? formatKitchenTicket(payload) : formatReceipt(payload);
  console.log(`\n${block}\n`);
}

async function processJob(env: Env, id: string): Promise<void> {
  await patchStatus(env, id, 'sent');
  const job = await fetchPrintJob(env, id);
  if (!job) {
    await patchStatus(env, id, 'failed', 'Job não encontrado ao buscar payload');
    return;
  }
  try {
    simulatePrint(job.payload);
    await patchStatus(env, id, 'printed');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await patchStatus(env, id, 'failed', message);
  }
}

async function syncQueued(env: Env): Promise<void> {
  const res = await fetch(`${env.apiBaseUrl}/api/v1/print-jobs?status=queued`, {
    headers: authHeaders(env),
  });
  if (!res.ok) {
    console.error(`[print-agent] sync inicial falhou: ${res.status}`);
    return;
  }
  const body = (await res.json()) as { data: PrintJobApi[] };
  for (const job of body.data) {
    await processJob(env, job.id);
  }
}

function connect(env: Env): void {
  const ws = new WebSocket(env.apiWsUrl, { headers: authHeaders(env) });

  ws.on('open', () => {
    console.log('[print-agent] conectado ao WS — sincronizando fila inicial');
    void syncQueued(env);
  });

  ws.on('message', (raw) => {
    try {
      const event = JSON.parse(raw.toString()) as QueuedEvent;
      if (event.type !== 'print_job_queued') return;
      void processJob(env, event.payload.id);
    } catch (err) {
      console.error('[print-agent] mensagem WS inválida', err);
    }
  });

  ws.on('close', (code) => {
    console.warn(`[print-agent] WS fechado (code=${code}) — reconectando em 5s`);
    setTimeout(() => connect(env), 5_000);
  });

  ws.on('error', (err) => {
    console.error('[print-agent] WS erro', err.message);
  });
}

function main(): void {
  const env = loadEnv();
  console.log(`[print-agent] iniciando — API: ${env.apiBaseUrl}`);
  connect(env);
}

main();
