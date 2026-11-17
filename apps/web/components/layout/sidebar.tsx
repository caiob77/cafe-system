import {
  BarChart3,
  BookOpen,
  ChefHat,
  CreditCard,
  MenuSquare,
  PackageCheck,
  Settings,
  Truck,
  Utensils,
} from 'lucide-react';
import Link from 'next/link';

import { canAccessRoute } from '@/features/auth/utils/can-access-route';
import type { CurrentUserResponse } from '@/lib/server-api';

const links = [
  { href: '/pedidos', label: 'Pedidos', icon: MenuSquare },
  { href: '/mesas', label: 'Mesas', icon: Utensils },
  { href: '/cardapio', label: 'Cardápio', icon: BookOpen },
  { href: '/caixa', label: 'Caixa', icon: CreditCard },
  { href: '/cozinha', label: 'Cozinha', icon: ChefHat },
  { href: '/delivery', label: 'Delivery', icon: Truck },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

type SidebarProps = {
  role: CurrentUserResponse['data']['role'];
};

function visibleLinks(role: SidebarProps['role']) {
  return links.filter((link) => canAccessRoute(link.href, role));
}

export function Sidebar({ role }: SidebarProps) {
  return (
    <aside className="hidden min-h-screen w-64 border-r bg-card lg:block">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <PackageCheck className="h-5 w-5 text-primary" />
        <span className="text-base font-semibold">Café System</span>
      </div>
      <nav className="space-y-1 p-3">
        {visibleLinks(role).map((link) => {
          const Icon = link.icon;
          return (
            <Link
              className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              href={link.href}
              key={link.href}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

const TABS_PER_PAGE = 4;

function tabPages(role: SidebarProps['role']) {
  const items = visibleLinks(role);
  const pages = [];

  for (let index = 0; index < items.length; index += TABS_PER_PAGE) {
    pages.push(items.slice(index, index + TABS_PER_PAGE));
  }

  return pages;
}

export function MobileNav({ role }: SidebarProps) {
  const pages = tabPages(role);

  return (
    <nav aria-label="Navegação" className="w-full min-w-0 border-t bg-card lg:hidden">
      <div className="flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:thin] [touch-action:pan-x]">
        {pages.map((page) => (
          <div
            className="grid min-w-full shrink-0 basis-full snap-always snap-start grid-cols-4 gap-1 p-2"
            key={page[0]?.href}
          >
            {page.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  className="flex h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-center text-[11px] font-medium leading-tight text-muted-foreground hover:bg-muted hover:text-foreground"
                  href={link.href}
                  key={link.href}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="w-full truncate">{link.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
