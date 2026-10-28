import { orderItemInputSchema } from '@cafe/shared';
import { z } from 'zod';

const slugSchema = z.string().trim().min(1).max(120);

const phoneRegex = /^[0-9+()\-\s]{8,20}$/;

const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, ' '))
  .pipe(z.string().regex(phoneRegex, 'Telefone inválido'));

const requiredTrimmed = (min: number, max: number) => z.string().trim().min(min).max(max);

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined || value === null) return null;
      return value.length === 0 ? null : value;
    });

export const publicSlugParamSchema = z.object({
  slug: slugSchema,
});

export const createPublicOrderSchema = z.object({
  customer: z.object({
    name: requiredTrimmed(2, 120),
    phone: phoneSchema,
    address: requiredTrimmed(2, 280),
    neighborhood: requiredTrimmed(2, 120),
    reference: optionalTrimmed(280),
  }),
  items: z.array(orderItemInputSchema).min(1).max(50),
  notes: optionalTrimmed(500),
  idempotencyKey: z.string().trim().min(8).max(128),
});

export type CreatePublicOrderInput = z.infer<typeof createPublicOrderSchema>;
