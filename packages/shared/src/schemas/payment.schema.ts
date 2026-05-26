import { z } from 'zod';

export const paymentMethodValues = ['cash', 'credit_card', 'debit_card', 'pix'] as const;
export const paymentMethodSchema = z.enum(paymentMethodValues);

const idString = z.string().min(1);

const positiveMoneyString = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === 'number' ? value.toFixed(2) : value.trim()))
  .pipe(
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Valor inválido. Use até 2 casas decimais.')
      .refine((value) => Number.parseFloat(value) > 0, 'Valor deve ser maior que zero'),
  );

const optionalMoneyString = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === 'number' ? value.toFixed(2) : value.trim()))
  .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valor inválido. Use até 2 casas decimais.'))
  .optional();

export const createPaymentSchema = z
  .object({
    method: paymentMethodSchema,
    amount: positiveMoneyString,
    amountReceived: optionalMoneyString,
    idempotencyKey: z.string().trim().min(8).max(128).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.amountReceived !== undefined) {
      if (value.method !== 'cash') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'amountReceived só é aceito quando method=cash',
          path: ['amountReceived'],
        });
        return;
      }
      const received = Number.parseFloat(value.amountReceived);
      const amount = Number.parseFloat(value.amount);
      if (received < amount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'amountReceived deve ser maior ou igual a amount',
          path: ['amountReceived'],
        });
      }
    }
  });

export const orderPaymentsParamSchema = z.object({
  id: idString,
});

export type PaymentMethodValue = (typeof paymentMethodValues)[number];
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
