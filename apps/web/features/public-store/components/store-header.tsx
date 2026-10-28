import { deliveryHours, deliveryStatusLabel } from '../schedule';

const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

type StoreHeaderProps = {
  name: string;
  logo: string | null;
  addressLine: string | null;
  phone: string | null;
  deliveryEnabled: boolean;
  deliveryOpen: boolean;
  schedule: unknown;
};

export function StoreHeader({
  name,
  logo,
  addressLine,
  phone,
  deliveryEnabled,
  deliveryOpen,
  schedule,
}: StoreHeaderProps) {
  const status = deliveryStatusLabel({ deliveryEnabled, deliveryOpen, schedule });
  const hours = deliveryHours(schedule);
  const closed = !deliveryEnabled || !deliveryOpen;

  return (
    <header className="px-4 pb-4 pt-6 lg:px-8 lg:pt-8">
      <div className="flex items-start gap-3">
        {logo ? (
          <img
            alt=""
            className="h-12 w-12 shrink-0 object-cover"
            height={48}
            src={logo}
            width={48}
          />
        ) : null}
        <div className="min-w-0">
          <h1 className="font-display text-[2rem] font-medium leading-none tracking-[-0.02em] text-balance">
            {name}
          </h1>
          <p className="mt-2 text-sm">{status}</p>
        </div>
      </div>

      {addressLine ? <p className="mt-4 text-sm text-muted-foreground">{addressLine}</p> : null}
      {phone ? (
        <p className="mt-1 text-sm">
          <a className={`underline-offset-4 hover:underline ${focusRing}`} href={`tel:${phone}`}>
            {phone}
          </a>
        </p>
      ) : null}

      {closed ? (
        <p className="mt-4 max-w-sm text-sm">
          O delivery está fechado. O cardápio continua disponível para consulta.
        </p>
      ) : null}

      {hours.length > 0 ? (
        <details className="mt-4 max-w-xs">
          <summary className={`cursor-pointer text-sm ${focusRing}`}>Ver horários</summary>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {hours.map((day) => (
              <li className="flex justify-between gap-4" key={day.key}>
                <span>{day.label}</span>
                <span className="tabular-nums">
                  {day.window ? `${day.window.open}–${day.window.close}` : 'Fechado'}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </header>
  );
}
