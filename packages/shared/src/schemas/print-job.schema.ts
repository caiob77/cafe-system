import { z } from 'zod';

export const printJobTypeValues = ['kitchen_ticket', 'payment_receipt'] as const;
export const printJobStatusValues = ['queued', 'sent', 'printed', 'failed'] as const;
export const printJobTypeSchema = z.enum(printJobTypeValues);
export const printJobStatusSchema = z.enum(printJobStatusValues);

const idString = z.string().min(1);

export const printJobIdParamSchema = z.object({
  id: idString,
});

export const updatePrintJobStatusSchema = z
  .object({
    status: printJobStatusSchema,
    errorMessage: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'failed' && !value.errorMessage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'errorMessage obrigatório quando status=failed',
        path: ['errorMessage'],
      });
    }
  });

export const listPrintJobsQuerySchema = z.object({
  status: printJobStatusSchema.optional(),
  type: printJobTypeSchema.optional(),
  orderId: idString.optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export type PrintJobTypeValue = (typeof printJobTypeValues)[number];
export type PrintJobStatusValue = (typeof printJobStatusValues)[number];
export type UpdatePrintJobStatusInput = z.infer<typeof updatePrintJobStatusSchema>;
export type ListPrintJobsQuery = z.infer<typeof listPrintJobsQuerySchema>;

// ----------------------------------------------------------------------------
// Payloads estruturados — o print-agent traduz para ESC/POS.
// Decimais sempre como string ('12.50') para evitar imprecisão.
// ----------------------------------------------------------------------------

export type KitchenTicketAddonLine = {
  name: string;
  quantity: number;
};

export type KitchenTicketItemLine = {
  name: string;
  quantity: number;
  notes: string | null;
  addons: KitchenTicketAddonLine[];
};

export type KitchenTicketPayload = {
  version: 1;
  kind: 'kitchen_ticket';
  orderId: string;
  dailyNumber: number;
  orderType: 'dine_in' | 'delivery';
  tableNumber: number | null;
  customerName: string | null;
  deliveryAddress: string | null;
  items: KitchenTicketItemLine[];
  kitchenNotes: string | null;
  createdAt: string;
};

export type ReceiptAddonLine = {
  name: string;
  quantity: number;
  unitPrice: string;
};

export type ReceiptItemLine = {
  name: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  notes: string | null;
  addons: ReceiptAddonLine[];
};

export type ReceiptPaymentLine = {
  method: 'cash' | 'credit_card' | 'debit_card' | 'pix';
  amount: string;
  changeAmount: string | null;
};

export type ReceiptPayload = {
  version: 1;
  kind: 'payment_receipt';
  orderId: string;
  dailyNumber: number;
  orgName: string;
  orderType: 'dine_in' | 'delivery';
  items: ReceiptItemLine[];
  subtotal: string;
  discountAmount: string | null;
  serviceChargeAmount: string | null;
  taxAmount: string | null;
  deliveryFee: string | null;
  total: string;
  payments: ReceiptPaymentLine[];
  createdAt: string;
  finishedAt: string;
};

export type PrintJobPayload = KitchenTicketPayload | ReceiptPayload;
