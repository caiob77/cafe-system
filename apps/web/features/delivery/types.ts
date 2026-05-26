export type DeliveryFee = {
  id: string;
  organizationId: string;
  neighborhood: string;
  fee: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateDeliveryFeePayload = { neighborhood: string; fee: string };
export type UpdateDeliveryFeePayload = Partial<CreateDeliveryFeePayload>;

export type WeekdayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export type DeliveryScheduleWindow = {
  open: string;
  close: string;
};

export type DeliverySchedule = Record<WeekdayKey, DeliveryScheduleWindow | null>;

export type DeliverySettings = {
  organizationId: string;
  deliveryEnabled: boolean;
  deliverySchedule: DeliverySchedule | null;
  defaultDeliveryFee: string | null;
};

export type UpdateDeliverySettingsPayload = {
  deliveryEnabled?: boolean;
  deliverySchedule?: DeliverySchedule | null;
  defaultDeliveryFee?: string | null;
};
