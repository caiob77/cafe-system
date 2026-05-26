export type Customer = {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  address: string | null;
  neighborhood: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateCustomerPayload = {
  name: string;
  phone: string;
  address?: string | null;
  neighborhood?: string | null;
  reference?: string | null;
  notes?: string | null;
};

export type UpdateCustomerPayload = Partial<CreateCustomerPayload>;
