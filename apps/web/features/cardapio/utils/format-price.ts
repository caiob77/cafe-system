const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPrice(value: string | number): string {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) return currencyFormatter.format(0);
  return currencyFormatter.format(numeric);
}

export function priceInputToApi(value: string): string {
  return value.replace(',', '.').trim();
}
