import { Prisma, type PrismaClient } from '@cafe/db';
import type { PaymentMethodValue } from '@cafe/shared';

const ZERO = new Prisma.Decimal(0);

export type CashRegisterRecord = Prisma.CashRegisterGetPayload<{
  include: { movements: true };
}>;

export type PaymentTotalsByMethod = Record<PaymentMethodValue, string>;

export type CashRegisterSummary = {
  payments: PaymentTotalsByMethod & { total: string; count: number };
  movements: { deposits: string; withdrawals: string; net: string };
  cashFlow: {
    initial: string;
    cashPayments: string;
    deposits: string;
    withdrawals: string;
    expected: string;
  };
};

const METHODS: PaymentMethodValue[] = ['cash', 'credit_card', 'debit_card', 'pix'];

function decimalToFixed(value: Prisma.Decimal | null | undefined): string {
  if (value === null || value === undefined) return '0.00';
  return value.toFixed(2);
}

export async function buildSummary(
  prisma: PrismaClient,
  register: CashRegisterRecord,
): Promise<CashRegisterSummary> {
  const [paymentsGrouped, paymentsCount] = await Promise.all([
    prisma.payment.groupBy({
      by: ['method'],
      where: { cashRegisterId: register.id },
      _sum: { amount: true },
    }),
    prisma.payment.count({ where: { cashRegisterId: register.id } }),
  ]);

  const payments = METHODS.reduce<PaymentTotalsByMethod>((acc, method) => {
    acc[method] = '0.00';
    return acc;
  }, {} as PaymentTotalsByMethod);

  let paymentsTotal = ZERO;
  for (const row of paymentsGrouped) {
    const sum = row._sum.amount ?? ZERO;
    payments[row.method as PaymentMethodValue] = sum.toFixed(2);
    paymentsTotal = paymentsTotal.add(sum);
  }

  let deposits = ZERO;
  let withdrawals = ZERO;
  for (const movement of register.movements) {
    if (movement.type === 'deposit') deposits = deposits.add(movement.amount);
    else withdrawals = withdrawals.add(movement.amount);
  }

  const cashPayments = new Prisma.Decimal(payments.cash);
  const expected = register.initialAmount.add(cashPayments).add(deposits).sub(withdrawals);

  return {
    payments: {
      ...payments,
      total: paymentsTotal.toFixed(2),
      count: paymentsCount,
    },
    movements: {
      deposits: deposits.toFixed(2),
      withdrawals: withdrawals.toFixed(2),
      net: deposits.sub(withdrawals).toFixed(2),
    },
    cashFlow: {
      initial: register.initialAmount.toFixed(2),
      cashPayments: cashPayments.toFixed(2),
      deposits: deposits.toFixed(2),
      withdrawals: withdrawals.toFixed(2),
      expected: expected.toFixed(2),
    },
  };
}

export function serializeCashRegister(
  register: CashRegisterRecord,
  summary: CashRegisterSummary | null,
) {
  return {
    id: register.id,
    organizationId: register.organizationId,
    openedById: register.openedById,
    closedById: register.closedById,
    openedAt: register.openedAt.toISOString(),
    closedAt: register.closedAt?.toISOString() ?? null,
    initialAmount: register.initialAmount.toFixed(2),
    finalAmount: decimalToFixedOrNull(register.finalAmount),
    expectedAmount: decimalToFixedOrNull(register.expectedAmount),
    difference: decimalToFixedOrNull(register.difference),
    notes: register.notes,
    version: register.version,
    isOpen: register.closedAt === null,
    movements: register.movements
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((movement) => ({
        id: movement.id,
        type: movement.type,
        amount: movement.amount.toFixed(2),
        reason: movement.reason,
        createdById: movement.createdById,
        createdAt: movement.createdAt.toISOString(),
      })),
    summary,
  };
}

function decimalToFixedOrNull(value: Prisma.Decimal | null): string | null {
  return value === null ? null : value.toFixed(2);
}

export { decimalToFixed };
