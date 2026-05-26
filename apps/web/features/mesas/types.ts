export type TableStatus = 'free' | 'occupied' | 'awaiting_payment';

export type Table = {
  id: string;
  organizationId: string;
  number: number;
  capacity: number;
  status: TableStatus;
  activeOrderId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type TableInput = {
  number: number;
  capacity?: number;
};
