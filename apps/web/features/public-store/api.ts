import { apiClient } from '@/lib/api-client';

import type {
  PublicDeliverySettings,
  PublicOrderPayload,
  PublicOrderResponse,
  PublicStoreMenu,
} from './types';

export function getPublicMenu(slug: string) {
  return apiClient<{ data: PublicStoreMenu }>(`/api/v1/public/${slug}/menu`).then(
    (res) => res.data,
  );
}

export function getPublicDeliverySettings(slug: string) {
  return apiClient<{ data: PublicDeliverySettings }>(
    `/api/v1/public/${slug}/delivery-settings`,
  ).then((res) => res.data);
}

export function createPublicOrder(slug: string, payload: PublicOrderPayload) {
  return apiClient<{ data: PublicOrderResponse }>(`/api/v1/public/${slug}/orders`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}
