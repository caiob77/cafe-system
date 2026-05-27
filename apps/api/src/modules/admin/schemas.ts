import { z } from 'zod';

export const listTenantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: z.enum(['all', 'active', 'suspended']).default('all'),
  plan: z.enum(['all', 'free', 'pro']).default('all'),
});

export const tenantIdParamSchema = z.object({
  id: z.string().min(1),
});

export const updateTenantSchema = z
  .object({
    plan: z.enum(['free', 'pro']).optional(),
    suspended: z.boolean().optional(),
    planExpiresAt: z.union([z.string().datetime(), z.null()]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos um campo.',
  });

export type ListTenantsQuery = z.infer<typeof listTenantsQuerySchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
