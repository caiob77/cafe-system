import { z } from 'zod';

export const tableStatusValues = ['free', 'occupied', 'awaiting_payment'] as const;
export const tableStatusSchema = z.enum(tableStatusValues);

export const tableIdParamSchema = z.object({
  id: z.string().min(1),
});

export const createTableSchema = z.object({
  number: z.coerce.number().int().positive().max(9999),
  capacity: z.coerce.number().int().positive().max(99).optional(),
});

export const updateTableSchema = z
  .object({
    number: z.coerce.number().int().positive().max(9999).optional(),
    capacity: z.coerce.number().int().positive().max(99).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos um campo para atualizar.',
  });

export const listTablesQuerySchema = z.object({
  status: tableStatusSchema.optional(),
  includeDeleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type TableStatusValue = (typeof tableStatusValues)[number];
export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
export type ListTablesQuery = z.infer<typeof listTablesQuerySchema>;
