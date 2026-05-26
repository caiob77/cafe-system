import { z } from 'zod';

const idString = z.string().min(1);

const phoneRegex = /^[0-9+()\-\s]{8,20}$/;

const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, ' '))
  .pipe(z.string().regex(phoneRegex, 'Telefone inválido'));

const optionalTrimmed = (max: number) =>
  z
    .union([z.string(), z.null()])
    .transform((value) => {
      if (value === null) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    })
    .pipe(z.string().max(max).nullable())
    .optional();

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  address: optionalTrimmed(280),
  neighborhood: optionalTrimmed(120),
  reference: optionalTrimmed(280),
  notes: optionalTrimmed(500),
});

export const updateCustomerSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: phoneSchema.optional(),
    address: optionalTrimmed(280),
    neighborhood: optionalTrimmed(120),
    reference: optionalTrimmed(280),
    notes: optionalTrimmed(500),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Pelo menos um campo deve ser informado',
  });

export const customerIdParamSchema = z.object({
  id: idString,
});

export const listCustomersQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
