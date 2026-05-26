import { z } from 'zod';

const priceSchema = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === 'number' ? value.toString() : value.trim()))
  .pipe(
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Preço deve ter no máximo 2 casas decimais')
      .refine((value) => Number(value) >= 0, 'Preço deve ser maior ou igual a zero')
      .refine((value) => Number(value) <= 99_999_999.99, 'Preço fora do limite'),
  );

export const productAddonIdParamSchema = z.object({
  productId: z.string().min(1),
  id: z.string().min(1),
});

export const productAddonProductParamSchema = z.object({
  productId: z.string().min(1),
});

export const createProductAddonSchema = z.object({
  name: z.string().trim().min(1).max(80),
  price: priceSchema,
  available: z.boolean().optional(),
});

export const updateProductAddonSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    price: priceSchema.optional(),
    available: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos um campo para atualizar.',
  });

export const listProductAddonsQuerySchema = z.object({
  available: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  includeDeleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type CreateProductAddonInput = z.infer<typeof createProductAddonSchema>;
export type UpdateProductAddonInput = z.infer<typeof updateProductAddonSchema>;
export type ListProductAddonsQuery = z.infer<typeof listProductAddonsQuerySchema>;
