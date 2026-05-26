export type ReportPeriod = 'day' | 'week' | 'month';

export type SalesReport = {
  period: ReportPeriod;
  from: string;
  to: string;
  buckets: Array<{ bucket: string; count: number; revenue: string }>;
  totals: { count: number; revenue: string };
};

export type ProductsReport = {
  from: string;
  to: string;
  items: Array<{ productId: string; name: string; quantity: number; revenue: string }>;
};

export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'pix';

export type PaymentsReport = {
  from: string;
  to: string;
  byMethod: Record<PaymentMethod, { amount: string; count: number }>;
  totals: { amount: string; count: number };
};

export type SummaryReport = {
  from: string;
  to: string;
  finishedOrders: number;
  cancelledOrders: number;
  revenue: string;
  averageTicket: string;
  itemsSold: number;
};

export type ReportFilters = { dateFrom?: string; dateTo?: string };
