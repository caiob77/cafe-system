'use client';

import { useState } from 'react';

import { imageVariant } from '@/lib/image-upload';

import { deliveryHours, deliveryStatusLabel } from '../schedule';

const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

type StoreHeaderProps = {
  name: string;
  logo: string | null;
  bannerUrl: string | null;
  addressLine: string | null;
  phone: string | null;
  deliveryEnabled: boolean;
  deliveryOpen: boolean;
  schedule: unknown;
};

export function StoreHeader({
  name,
  logo,
  bannerUrl,
  addressLine,
  phone,
  deliveryEnabled,
  deliveryOpen,
  schedule,
}: StoreHeaderProps) {
  const status = deliveryStatusLabel({ deliveryEnabled, deliveryOpen, schedule });
  const hours = deliveryHours(schedule);
  const closed = !deliveryEnabled || !deliveryOpen;
  const [bannerFailed, setBannerFailed] = useState(false);
  const showBanner = Boolean(bannerUrl) && !bannerFailed;

  return (
    <>
      {showBanner ? (
        <div className="relative">
          <div className="aspect-[16/7] w-full overflow-hidden bg-[hsl(var(--wash))] lg:aspect-[21/8]">
            <img
              alt=""
              className="h-full w-full object-cover"
              height={448}
              onError={() => setBannerFailed(true)}
              sizes="(min-width: 1024px) 720px, 100vw"
              src={imageVariant(bannerUrl ?? '', { width: 1280, height: 560 })}
              srcSet={[720, 1080, 1600]
                .map(
                  (w) =>
                    `${imageVariant(bannerUrl ?? '', { width: w, height: Math.round((w * 7) / 16) })} ${w}w`,
                )
                .join(', ')}
              width={1280}
            />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[hsl(var(--background))] to-transparent"
          />
        </div>
      ) : null}

      <header className="px-4 pb-5 pt-6 lg:px-8 lg:pt-8">
        <div className="flex items-end gap-4">
          {logo ? (
            <img
              alt=""
              className="h-14 w-14 shrink-0 object-cover"
              height={56}
              src={imageVariant(logo, { width: 112, height: 112, crop: 'limit' })}
              width={56}
            />
          ) : null}
          <div className="min-w-0">
            <h1 className="font-display text-[2.35rem] font-medium leading-[0.95] tracking-[-0.03em] text-balance break-words sm:text-[2.75rem]">
              {name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{status}</p>
          </div>
        </div>

        {(addressLine || phone) && (
          <div className="mt-4 max-w-md space-y-1 break-words text-sm text-muted-foreground">
            {addressLine ? <p>{addressLine}</p> : null}
            {phone ? (
              <p>
                <a
                  className={`text-foreground underline-offset-4 hover:underline ${focusRing}`}
                  href={`tel:${phone}`}
                >
                  {phone}
                </a>
              </p>
            ) : null}
          </div>
        )}

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
    </>
  );
}
