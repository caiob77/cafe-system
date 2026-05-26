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

const urlOrEmpty = z
  .string()
  .trim()
  .max(2048)
  .url('URL inválida')
  .or(z.literal(''))
  .transform((value) => (value === '' ? null : value));

export const productIdParamSchema = z.object({
  id: z.string().min(1),
});

export const createProductSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  price: priceSchema,
  imageUrl: urlOrEmpty.optional().nullable(),
  imagePublicId: z.string().trim().max(255).optional().nullable(),
  available: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const updateProductSchema = z
  .object({
    categoryId: z.string().min(1).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    price: priceSchema.optional(),
    imageUrl: urlOrEmpty.optional().nullable(),
    imagePublicId: z.string().trim().max(255).optional().nullable(),
    available: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos um campo para atualizar.',
  });

export const updateProductAvailabilitySchema = z.object({
  available: z.boolean(),
});

export const listProductsQuerySchema = z.object({
  categoryId: z.string().min(1).optional(),
  available: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  includeDeleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateProductAvailabilityInput = z.infer<typeof updateProductAvailabilitySchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
