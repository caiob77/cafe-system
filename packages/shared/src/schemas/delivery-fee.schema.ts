import { z } from 'zod';

const idString = z.string().min(1);

const neighborhoodSchema = z
  .string()
  .trim()
  .min(2, 'Bairro precisa ter pelo menos 2 caracteres')
  .max(120, 'Bairro muito longo');

const feeSchema = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === 'number' ? value.toFixed(2) : value.trim()))
  .pipe(
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Valor inválido. Use até 2 casas decimais.')
      .refine((value) => Number.parseFloat(value) >= 0, 'Taxa não pode ser negativa'),
  );

export const createDeliveryFeeSchema = z.object({
  neighborhood: neighborhoodSchema,
  fee: feeSchema,
});

export const updateDeliveryFeeSchema = z
  .object({
    neighborhood: neighborhoodSchema.optional(),
    fee: feeSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Pelo menos um campo deve ser informado',
  });

export const deliveryFeeIdParamSchema = z.object({
  id: idString,
});

export type CreateDeliveryFeeInput = z.infer<typeof createDeliveryFeeSchema>;
export type UpdateDeliveryFeeInput = z.infer<typeof updateDeliveryFeeSchema>;
