import { formatPrice } from '@/features/cardapio/utils/format-price';

type OrderSuccessProps = {
  organizationName: string;
  dailyNumber: number;
  total: string;
  onAnother: () => void;
};

export function OrderSuccess({
  organizationName,
  dailyNumber,
  total,
  onAnother,
}: OrderSuccessProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-16">
      <p className="text-sm text-muted-foreground">{organizationName}</p>
      <h1 className="mt-3 font-display text-5xl font-medium leading-none tracking-[-0.03em]">
        Pedido {dailyNumber}
      </h1>
      <p className="mt-4 text-base">Recebemos seu pedido.</p>
      <p className="mt-8 text-sm text-muted-foreground">Total</p>
      <p className="font-display text-3xl font-semibold leading-none tabular-nums">
        {formatPrice(total)}
      </p>
      <button
        className="mt-10 inline-flex h-12 items-center justify-center bg-primary px-4 text-base font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={onAnother}
        type="button"
      >
        Fazer outro pedido
      </button>
    </main>
  );
}
