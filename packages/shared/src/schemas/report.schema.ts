import { z } from 'zod';

export const reportPeriodValues = ['day', 'week', 'month'] as const;
export const reportPeriodSchema = z.enum(reportPeriodValues);

const optionalIsoDate = z.string().datetime().optional();

const baseRangeSchema = z.object({
  dateFrom: optionalIsoDate,
  dateTo: optionalIsoDate,
});

export const salesReportQuerySchema = baseRangeSchema.extend({
  period: reportPeriodSchema.optional().default('day'),
});

export const productsReportQuerySchema = baseRangeSchema.extend({
  limit: z.coerce.number().int().positive().max(200).optional().default(20),
});

export const paymentsReportQuerySchema = baseRangeSchema;
export const summaryReportQuerySchema = baseRangeSchema;

export type ReportPeriodValue = (typeof reportPeriodValues)[number];
export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;
export type ProductsReportQuery = z.infer<typeof productsReportQuerySchema>;
export type PaymentsReportQuery = z.infer<typeof paymentsReportQuerySchema>;
export type SummaryReportQuery = z.infer<typeof summaryReportQuerySchema>;
