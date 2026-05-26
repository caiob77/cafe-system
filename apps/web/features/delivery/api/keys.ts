export const deliveryFeeKeys = {
  all: ['delivery-fees'] as const,
  lists: () => [...deliveryFeeKeys.all, 'list'] as const,
};
