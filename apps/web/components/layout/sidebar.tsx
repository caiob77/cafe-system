'use client';

import {
  BarChart3,
  BookOpen,
  ChefHat,
  CreditCard,
  type LucideIcon,
  MenuSquare,
  MoreHorizontal,
  PackageCheck,
  Settings,
  Truck,
  Utensils,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { canAccessRoute } from '@/features/auth/utils/can-access-route';
import type { CurrentUserResponse } from '@/lib/server-api';

type NavLink = { href: string; label: string; icon: LucideIcon };

const links: NavLink[] = [
  { href: '/pedidos', label: 'Pedidos', icon: MenuSquare },
  { href: '/mesas', label: 'Mesas', icon: Utensils },
  { href: '/cardapio', label: 'Cardápio', icon: BookOpen },
  { href: '/caixa', label: 'Caixa', icon: CreditCard },
  { href: '/cozinha', label: 'Cozinha', icon: ChefHat },
  { href: '/delivery', label: 'Delivery', icon: Truck },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

// Ordem de prioridade na barra inferior do celular: operação do salão primeiro.
const mobilePriority = [
  '/pedidos',
  '/mesas',
  '/cozinha',
  '/caixa',
  '/delivery',
  '/cardapio',
  '/relatorios',
  '/configuracoes',
];

const MAX_MOBILE_TABS = 5;

type Role = CurrentUserResponse['data']['role'];

type SidebarProps = {
  role: Role;
};

function visibleLinks(role: Role) {
  return links.filter((link) => canAccessRoute(link.href, role));
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-card lg:flex">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <PackageCheck className="h-5 w-5 text-primary" />
        <span className="text-base font-semibold">Café System</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleLinks(role).map((link) => {
          const Icon = link.icon;
          const active = isActive(pathname, link.href);
          return (
            <Link
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
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

function splitMobileLinks(role: Role) {
  const items = visibleLinks(role).sort(
    (a, b) => mobilePriority.indexOf(a.href) - mobilePriority.indexOf(b.href),
  );
  if (items.length <= MAX_MOBILE_TABS) return { primary: items, overflow: [] };
  return {
    primary: items.slice(0, MAX_MOBILE_TABS - 1),
    overflow: items.slice(MAX_MOBILE_TABS - 1),
  };
}

const tabClass =
  'relative flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium leading-tight transition-colors';

export function MobileNav({ role }: SidebarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { primary, overflow } = splitMobileLinks(role);
  const overflowActive = overflow.some((link) => isActive(pathname, link.href));

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-safe backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:hidden"
      >
        <div className="mx-auto flex max-w-xl items-stretch px-1">
          {primary.map((link) => {
            const Icon = link.icon;
            const active = isActive(pathname, link.href);
            return (
              <Link
                aria-current={active ? 'page' : undefined}
                className={cn(tabClass, active ? 'text-primary' : 'text-muted-foreground')}
                href={link.href}
                key={link.href}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    active && 'bg-primary/10',
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                </span>
                <span className="w-full truncate text-center">{link.label}</span>
              </Link>
            );
          })}
          {overflow.length > 0 ? (
            <button
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              className={cn(
                tabClass,
                overflowActive || moreOpen ? 'text-primary' : 'text-muted-foreground',
              )}
              onClick={() => setMoreOpen(true)}
              type="button"
            >
              <span
                className={cn(
                  'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                  overflowActive && 'bg-primary/10',
                )}
              >
                <MoreHorizontal className="h-5 w-5 shrink-0" />
              </span>
              <span>Mais</span>
            </button>
          ) : null}
        </div>
      </nav>

      {overflow.length > 0 ? (
        <Dialog onOpenChange={setMoreOpen} open={moreOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mais opções</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2">
              {overflow.map((link) => {
                const Icon = link.icon;
                const active = isActive(pathname, link.href);
                return (
                  <Link
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-20 flex-col items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors active:scale-[0.98]',
                      active
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'bg-background hover:bg-muted',
                    )}
                    href={link.href}
                    key={link.href}
                    onClick={() => setMoreOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
