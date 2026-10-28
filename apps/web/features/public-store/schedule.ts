const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const WEEK_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export type WeekdayKey = (typeof WEEKDAYS)[number];

export type DeliveryWindow = {
  open: string;
  close: string;
};

export type DeliveryScheduleMap = Record<WeekdayKey, DeliveryWindow | null>;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const WEEKDAY_LABEL: Record<WeekdayKey, string> = {
  sun: 'Domingo',
  mon: 'Segunda',
  tue: 'Terça',
  wed: 'Quarta',
  thu: 'Quinta',
  fri: 'Sexta',
  sat: 'Sábado',
};

const WEEKDAY_FROM_LABEL: Record<string, WeekdayKey> = {
  Sun: 'sun',
  Mon: 'mon',
  Tue: 'tue',
  Wed: 'wed',
  Thu: 'thu',
  Fri: 'fri',
  Sat: 'sat',
};

const SAO_PAULO_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hourCycle: 'h23',
});

export function parseDeliverySchedule(value: unknown): DeliveryScheduleMap | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const schedule = {} as DeliveryScheduleMap;

  for (const key of WEEKDAYS) {
    const entry = record[key];
    if (entry === null) {
      schedule[key] = null;
      continue;
    }
    if (!entry || typeof entry !== 'object') return null;
    const open = (entry as { open?: unknown }).open;
    const close = (entry as { close?: unknown }).close;
    if (typeof open !== 'string' || typeof close !== 'string') return null;
    if (!TIME.test(open) || !TIME.test(close) || open >= close) return null;
    schedule[key] = { open, close };
  }

  return schedule;
}

function saoPauloMoment(now: Date) {
  const parts = SAO_PAULO_TIME.formatToParts(now);
  const weekdayLabel = parts.find((part) => part.type === 'weekday')?.value ?? '';
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  return {
    weekday: WEEKDAY_FROM_LABEL[weekdayLabel] ?? 'sun',
    hhmm: `${hour}:${minute}`,
  };
}

export function deliveryStatusLabel(input: {
  deliveryEnabled: boolean;
  deliveryOpen: boolean;
  schedule: unknown;
  now?: Date;
}) {
  if (!input.deliveryEnabled) return 'Delivery pausado';

  const schedule = parseDeliverySchedule(input.schedule);
  if (!input.deliveryOpen) {
    if (!schedule) return 'Fechado agora';
    const { weekday, hhmm } = saoPauloMoment(input.now ?? new Date());
    const window = schedule[weekday];
    if (!window) return 'Fechado hoje';
    if (hhmm < window.open) return `Abre às ${window.open}`;
    return 'Fechado hoje';
  }

  if (!schedule) return 'Aberto agora';
  const { weekday } = saoPauloMoment(input.now ?? new Date());
  const window = schedule[weekday];
  if (!window) return 'Aberto agora';
  return `Aberto até ${window.close}`;
}

export function deliveryHours(schedule: unknown) {
  const parsed = parseDeliverySchedule(schedule);
  if (!parsed) return [];
  return WEEK_ORDER.map((key) => ({
    key,
    label: WEEKDAY_LABEL[key],
    window: parsed[key],
  }));
}
