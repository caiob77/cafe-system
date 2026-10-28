import { Fraunces, Source_Sans_3 } from 'next/font/google';

import { StoreTheme } from '@/features/public-store/components/store-theme';

const display = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-store-display',
});

const sans = Source_Sans_3({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-store-sans',
});

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return <StoreTheme className={`${display.variable} ${sans.variable}`}>{children}</StoreTheme>;
}
