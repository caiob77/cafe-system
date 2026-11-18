import type { Metadata, Viewport } from 'next';

import { AppProviders } from '@/providers/app-providers';

import './globals.css';

export const metadata: Metadata = {
  title: 'Café System',
  description: 'Sistema de pedidos e caixa para cafés da manhã',
  appleWebApp: { capable: true, title: 'Café System', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f9f7f3',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
