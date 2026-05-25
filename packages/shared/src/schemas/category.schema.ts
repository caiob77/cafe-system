import { z } from 'zod';

export const categoryIdParamSchema = z.object({
  id: z.string().min(1),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos um campo para atualizar.',
  });

export const listCategoriesQuerySchema = z.object({
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  includeDeleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export const reorderCategoriesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;
