export const cashRegisterKeys = {
  all: ['cash-registers'] as const,
  current: () => [...cashRegisterKeys.all, 'current'] as const,
  detail: (id: string) => [...cashRegisterKeys.all, 'detail', id] as const,
};
