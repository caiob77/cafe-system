import { z } from 'zod';

export const orderTypeValues = ['dine_in', 'delivery'] as const;
export const orderStatusValues = [
  'pending',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'finished',
  'cancelled',
] as const;

export const orderTypeSchema = z.enum(orderTypeValues);
export const orderStatusSchema = z.enum(orderStatusValues);

const idString = z.string().min(1);

export const orderItemAddonInputSchema = z.object({
  productAddonId: idString,
  quantity: z.coerce.number().int().positive().max(99).optional(),
});

export const orderItemInputSchema = z.object({
  productId: idString,
  quantity: z.coerce.number().int().positive().max(99),
  notes: z.string().trim().max(280).optional().nullable(),
  addons: z.array(orderItemAddonInputSchema).max(20).optional(),
});

export const createOrderSchema = z
  .object({
    type: orderTypeSchema,
    tableId: idString.optional().nullable(),
    customerId: idString.optional().nullable(),
    items: z.array(orderItemInputSchema).min(1).max(50),
    notes: z.string().trim().max(500).optional().nullable(),
    kitchenNotes: z.string().trim().max(500).optional().nullable(),
    deliveryAddress: z.string().trim().max(500).optional().nullable(),
    idempotencyKey: z.string().trim().min(8).max(128).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'dine_in' && !value.tableId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'tableId obrigatório para pedido de mesa',
        path: ['tableId'],
      });
    }
    if (value.type === 'delivery' && !value.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'customerId obrigatório para pedido delivery',
        path: ['customerId'],
      });
    }
  });

export const addOrderItemSchema = orderItemInputSchema;

export const updateOrderStatusSchema = z
  .object({
    status: orderStatusSchema,
    version: z.coerce.number().int().min(0),
    cancelReason: z.string().trim().min(2).max(280).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'cancelled' && !value.cancelReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'cancelReason obrigatório ao cancelar pedido',
        path: ['cancelReason'],
      });
    }
  });

export const orderIdParamSchema = z.object({
  id: idString,
});

export const orderItemParamSchema = z.object({
  id: idString,
  itemId: idString,
});

export const listOrdersQuerySchema = z.object({
  status: orderStatusSchema.optional(),
  type: orderTypeSchema.optional(),
  tableId: idString.optional(),
  customerId: idString.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export type OrderTypeValue = (typeof orderTypeValues)[number];
export type OrderStatusValue = (typeof orderStatusValues)[number];
export type OrderItemAddonInput = z.infer<typeof orderItemAddonInputSchema>;
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type AddOrderItemInput = z.infer<typeof addOrderItemSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
