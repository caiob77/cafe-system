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

export function MobileNav({ role }: SidebarProps) {
  return (
    <nav className="grid grid-cols-4 gap-1 border-t bg-card p-2 lg:hidden">
      {visibleLinks(role)
        .slice(0, 4)
        .map((link) => {
          const Icon = link.icon;
          return (
            <Link
              className="flex h-12 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              href={link.href}
              key={link.href}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
    </nav>
  );
}
