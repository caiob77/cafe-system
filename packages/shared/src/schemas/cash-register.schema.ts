import { z } from 'zod';

export const cashMovementTypeValues = ['withdrawal', 'deposit'] as const;
export const cashMovementTypeSchema = z.enum(cashMovementTypeValues);

const idString = z.string().min(1);

const moneyString = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === 'number' ? value.toFixed(2) : value.trim()))
  .pipe(
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Valor inválido. Use até 2 casas decimais.')
      .refine((value) => Number.parseFloat(value) >= 0, 'Valor não pode ser negativo'),
  );

const positiveMoneyString = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === 'number' ? value.toFixed(2) : value.trim()))
  .pipe(
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Valor inválido. Use até 2 casas decimais.')
      .refine((value) => Number.parseFloat(value) > 0, 'Valor deve ser maior que zero'),
  );

export const cashRegisterIdParamSchema = z.object({
  id: idString,
});

export const openCashRegisterSchema = z.object({
  initialAmount: moneyString,
  notes: z.string().trim().max(500).optional().nullable(),
});

export const closeCashRegisterSchema = z.object({
  finalAmount: moneyString.optional(),
  notes: z.string().trim().max(500).optional().nullable(),
  version: z.coerce.number().int().min(0),
});

export const cashMovementSchema = z.object({
  type: cashMovementTypeSchema,
  amount: positiveMoneyString,
  reason: z.string().trim().min(2).max(280),
});

export type CashMovementTypeValue = (typeof cashMovementTypeValues)[number];
export type OpenCashRegisterInput = z.infer<typeof openCashRegisterSchema>;
export type CloseCashRegisterInput = z.infer<typeof closeCashRegisterSchema>;
export type CashMovementInput = z.infer<typeof cashMovementSchema>;
