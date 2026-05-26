export type CashMovementType = 'withdrawal' | 'deposit';

export type CashMovement = {
  id: string;
  type: CashMovementType;
  amount: string;
  reason: string;
  createdById: string;
  createdAt: string;
};

export type CashRegisterSummary = {
  payments: {
    cash: string;
    credit_card: string;
    debit_card: string;
    pix: string;
    total: string;
    count: number;
  };
  movements: { deposits: string; withdrawals: string; net: string };
  cashFlow: {
    initial: string;
    cashPayments: string;
    deposits: string;
    withdrawals: string;
    expected: string;
  };
};

export type CashRegister = {
  id: string;
  organizationId: string;
  openedById: string;
  closedById: string | null;
  openedAt: string;
  closedAt: string | null;
  initialAmount: string;
  finalAmount: string | null;
  expectedAmount: string | null;
  difference: string | null;
  notes: string | null;
  version: number;
  isOpen: boolean;
  movements: CashMovement[];
  summary: CashRegisterSummary | null;
};

export type OpenCashRegisterPayload = { initialAmount: string; notes?: string };
export type CloseCashRegisterPayload = { finalAmount?: string; notes?: string; version: number };
export type CashMovementPayload = { type: CashMovementType; amount: string; reason: string };
