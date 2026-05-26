'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

import type {
  PaymentsReport,
  ProductsReport,
  ReportFilters,
  ReportPeriod,
  SalesReport,
  SummaryReport,
} from '../types';
import { reportKeys } from './keys';

function buildQuery(filters: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.append(key, String(value));
  }
  const qs = params.toString();
  return qs.length > 0 ? `?${qs}` : '';
}

function isoOrUndefined(date?: string): string | undefined {
  if (!date) return undefined;
  if (date.length === 10) return `${date}T00:00:00.000Z`;
  return new Date(date).toISOString();
}

export function useSalesReport(filters: ReportFilters & { period: ReportPeriod }) {
  return useQuery({
    queryKey: reportKeys.sales(filters),
    queryFn: () => {
      const qs = buildQuery({
        period: filters.period,
        dateFrom: isoOrUndefined(filters.dateFrom),
        dateTo: isoOrUndefined(filters.dateTo),
      });
      return apiClient<{ data: SalesReport }>(`/api/v1/reports/sales${qs}`).then(
        (res) => res.data,
      );
    },
    staleTime: 30_000,
  });
}

export function useProductsReport(filters: ReportFilters & { limit?: number }) {
  return useQuery({
    queryKey: reportKeys.products(filters),
    queryFn: () => {
      const qs = buildQuery({
        limit: filters.limit,
        dateFrom: isoOrUndefined(filters.dateFrom),
        dateTo: isoOrUndefined(filters.dateTo),
      });
      return apiClient<{ data: ProductsReport }>(`/api/v1/reports/products${qs}`).then(
        (res) => res.data,
      );
    },
    staleTime: 30_000,
  });
}

export function usePaymentsReport(filters: ReportFilters) {
  return useQuery({
    queryKey: reportKeys.payments(filters),
    queryFn: () => {
      const qs = buildQuery({
        dateFrom: isoOrUndefined(filters.dateFrom),
        dateTo: isoOrUndefined(filters.dateTo),
      });
      return apiClient<{ data: PaymentsReport }>(`/api/v1/reports/payments${qs}`).then(
        (res) => res.data,
      );
    },
    staleTime: 30_000,
  });
}

export function useSummaryReport(filters: ReportFilters) {
  return useQuery({
    queryKey: reportKeys.summary(filters),
    queryFn: () => {
      const qs = buildQuery({
        dateFrom: isoOrUndefined(filters.dateFrom),
        dateTo: isoOrUndefined(filters.dateTo),
      });
      return apiClient<{ data: SummaryReport }>(`/api/v1/reports/summary${qs}`).then(
        (res) => res.data,
      );
    },
    staleTime: 30_000,
  });
}
