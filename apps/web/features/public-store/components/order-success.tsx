import { formatPrice } from '@/features/cardapio/utils/format-price';

const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

type OrderSuccessProps = {
  organizationName: string;
  dailyNumber: number;
  total: string;
  phone: string | null;
  onAnother: () => void;
};

export function OrderSuccess({
  organizationName,
  dailyNumber,
  total,
  phone,
  onAnother,
}: OrderSuccessProps) {
  const whatsappUrl = cafeWhatsappUrl(
    phone,
    `Olá! Fiz o pedido ${dailyNumber} e quero acompanhar.`,
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-16">
      <p className="text-sm text-muted-foreground">{organizationName}</p>
      <h1 className="mt-3 font-display text-5xl font-medium leading-none tracking-[-0.03em]">
        Pedido {dailyNumber}
      </h1>
      <p className="mt-4 text-base">Recebemos seu pedido.</p>
      {whatsappUrl ? (
        <div className="mt-8">
          <p className="text-base">Acompanhe seu pedido pelo WhatsApp.</p>
          <a
            className={`mt-4 inline-flex h-12 w-full items-center justify-center bg-primary px-4 text-base font-semibold text-primary-foreground ${focusRing}`}
            href={whatsappUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Abrir WhatsApp do café
          </a>
        </div>
      ) : null}
      <p className="mt-8 text-sm text-muted-foreground">Total</p>
      <p className="font-display text-3xl font-semibold leading-none tabular-nums">
        {formatPrice(total)}
      </p>
      <button
        className={
          whatsappUrl
            ? `mt-6 inline-flex h-12 items-center justify-center border border-[hsl(var(--line))] px-4 text-base font-semibold ${focusRing}`
            : `mt-10 inline-flex h-12 items-center justify-center bg-primary px-4 text-base font-semibold text-primary-foreground ${focusRing}`
        }
        onClick={onAnother}
        type="button"
      >
        Fazer outro pedido
      </button>
    </main>
  );
}

/** Monta wa.me a partir do telefone do café. Número local brasileiro ganha o 55. */
export function cafeWhatsappUrl(phone: string | null, message: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 15) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
