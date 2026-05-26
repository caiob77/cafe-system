import type { ReportFilters, ReportPeriod } from '../types';

export const reportKeys = {
  all: ['reports'] as const,
  sales: (filters: ReportFilters & { period: ReportPeriod }) =>
    [...reportKeys.all, 'sales', filters] as const,
  products: (filters: ReportFilters & { limit?: number }) =>
    [...reportKeys.all, 'products', filters] as const,
  payments: (filters: ReportFilters) => [...reportKeys.all, 'payments', filters] as const,
  summary: (filters: ReportFilters) => [...reportKeys.all, 'summary', filters] as const,
};
