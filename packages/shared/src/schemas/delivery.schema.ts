import { z } from 'zod';

export const weekdayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type WeekdayKey = (typeof weekdayKeys)[number];

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:MM (24h)');
const moneyString = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === 'number' ? value.toString() : value.trim()))
  .pipe(
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Valor deve ter no máximo 2 casas decimais')
      .refine((value) => Number(value) >= 0, 'Valor deve ser maior ou igual a zero')
      .refine((value) => Number(value) <= 99_999_999.99, 'Valor fora do limite'),
  );

export const deliveryWindowSchema = z
  .object({
    open: timeString,
    close: timeString,
  })
  .superRefine((value, ctx) => {
    if (value.open >= value.close) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '"open" deve ser anterior a "close"',
        path: ['close'],
      });
    }
  });

export const deliveryScheduleSchema = z.object({
  sun: deliveryWindowSchema.nullable(),
  mon: deliveryWindowSchema.nullable(),
  tue: deliveryWindowSchema.nullable(),
  wed: deliveryWindowSchema.nullable(),
  thu: deliveryWindowSchema.nullable(),
  fri: deliveryWindowSchema.nullable(),
  sat: deliveryWindowSchema.nullable(),
});

export const updateDeliverySettingsSchema = z
  .object({
    deliveryEnabled: z.boolean().optional(),
    deliverySchedule: deliveryScheduleSchema.nullable().optional(),
    defaultDeliveryFee: moneyString.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos uma configuração para atualizar.',
  });

export type DeliveryWindow = z.infer<typeof deliveryWindowSchema>;
export type DeliverySchedule = z.infer<typeof deliveryScheduleSchema>;
export type UpdateDeliverySettingsInput = z.infer<typeof updateDeliverySettingsSchema>;

const WEEKDAY_INDEX: Record<number, WeekdayKey> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};

const SAO_PAULO_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hour12: false,
});

const WEEKDAY_FROM_LABEL: Record<string, WeekdayKey> = {
  Sun: 'sun',
  Mon: 'mon',
  Tue: 'tue',
  Wed: 'wed',
  Thu: 'thu',
  Fri: 'fri',
  Sat: 'sat',
};

export function getCurrentDeliveryMoment(now: Date = new Date()): {
  weekday: WeekdayKey;
  hhmm: string;
} {
  const parts = SAO_PAULO_TIME.formatToParts(now);
  const weekdayLabel = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return {
    weekday: WEEKDAY_FROM_LABEL[weekdayLabel] ?? WEEKDAY_INDEX[now.getUTCDay()] ?? 'sun',
    hhmm: `${hour}:${minute}`,
  };
}

export function isDeliveryOpen(
  schedule: DeliverySchedule | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!schedule) return true; // sem schedule configurado = sempre aberto se deliveryEnabled
  const { weekday, hhmm } = getCurrentDeliveryMoment(now);
  const window = schedule[weekday];
  if (!window) return false;
  return hhmm >= window.open && hhmm < window.close;
}
