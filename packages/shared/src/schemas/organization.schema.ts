import { z } from 'zod';

import { deliveryScheduleSchema } from './delivery.schema.js';

function trimmed(maxLen: number, message: string) {
  return z
    .string()
    .max(maxLen, message)
    .transform((value) => value.trim())
    .pipe(z.string().min(1, 'Valor obrigatório'));
}

export const updateOrganizationProfileSchema = z
  .object({
    logo: z.union([z.string().url('Logo deve ser uma URL válida'), z.null()]).optional(),
    name: trimmed(120, 'Nome muito longo').optional(),
    addressLine: z.union([trimmed(200, 'Endereço muito longo'), z.null()]).optional(),
    phone: z.union([trimmed(40, 'Telefone muito longo'), z.null()]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos um campo para atualizar.',
  });

const moneyString = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === 'number' ? value.toFixed(2) : value.trim()))
  .pipe(
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Valor inválido. Use até 2 casas decimais.')
      .refine((value) => Number.parseFloat(value) >= 0, 'Valor não pode ser negativo'),
  );

const completeSetupDeliveryFeeSchema = z.object({
  neighborhood: z.string().trim().min(2, 'Bairro muito curto').max(120, 'Bairro muito longo'),
  fee: moneyString,
});

const completeSetupPrinterSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto').max(120, 'Nome muito longo'),
});

export const completeSetupSchema = z
  .object({
    addressLine: z
      .union([trimmed(200, 'Endereço muito longo'), z.null()])
      .optional(),
    phone: z.union([trimmed(40, 'Telefone muito longo'), z.null()]).optional(),
    tableCount: z
      .number()
      .int('Quantidade de mesas deve ser inteira')
      .min(0, 'Quantidade de mesas não pode ser negativa')
      .max(500, 'Limite de 500 mesas')
      .optional(),
    deliveryEnabled: z.boolean().optional(),
    deliverySchedule: deliveryScheduleSchema.nullable().optional(),
    defaultDeliveryFee: z.union([moneyString, z.null()]).optional(),
    deliveryFees: z.array(completeSetupDeliveryFeeSchema).max(200).optional(),
    printer: completeSetupPrinterSchema.nullable().optional(),
  })
  .optional();

export type UpdateOrganizationProfileInput = z.infer<typeof updateOrganizationProfileSchema>;
export type CompleteSetupInput = z.infer<typeof completeSetupSchema>;
