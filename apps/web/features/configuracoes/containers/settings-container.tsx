'use client';

import {
  BookOpen,
  Building2,
  ChefHat,
  Crown,
  Mail,
  Printer,
  ShieldCheck,
  Truck,
  UserCircle,
} from 'lucide-react';
import Link from 'next/link';

import { useSessionUI } from '@/features/auth/context/session-ui-provider';

import { labelRole } from '../roles';

const sections = [
  {
    href: '/configuracoes/cafe',
    icon: Building2,
    title: 'Dados do café',
    description: 'Nome, telefone, endereço, logo e cor da marca da loja pública.',
  },
  {
    href: '/configuracoes/equipe',
    icon: ShieldCheck,
    title: 'Equipe e permissões',
    description: 'Membros, papéis e acessos do café ativo.',
  },
  {
    href: '/configuracoes/impressao',
    icon: Printer,
    title: 'Impressão térmica',
    description: 'Impressoras do agente e o token de conexão.',
  },
  {
    href: '/delivery?aba=configuracoes',
    icon: Truck,
    title: 'Delivery',
    description:
      'Liga ou desliga a entrega, taxa padrão e horário. Taxas por bairro ficam na mesma página.',
  },
  {
    href: '/cardapio',
    icon: BookOpen,
    title: 'Cardápio',
    description: 'Categorias, produtos e adicionais.',
  },
];

export function SettingsContainer() {
  const session = useSessionUI();
  const role = session.role;

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold">Sua conta</h2>
          </div>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Nome</dt>
            <dd>{session.user.name}</dd>
            <dt className="text-muted-foreground">E-mail</dt>
            <dd className="flex items-center gap-1">
              <Mail className="h-3 w-3 text-muted-foreground" />
              {session.user.email}
            </dd>
            <dt className="text-muted-foreground">Papel</dt>
            <dd>{role ? labelRole(role) : 'Sem função'}</dd>
          </dl>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold">Café ativo</h2>
          </div>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Tenant</dt>
            <dd className="break-all font-mono text-xs">{session.tenantId ?? '—'}</dd>
            <dt className="text-muted-foreground">Sessão</dt>
            <dd className="break-all font-mono text-xs">{session.session.id}</dd>
          </dl>
        </div>

        <Link
          className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm transition hover:border-primary hover:shadow"
          href="/configuracoes/plano"
        >
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold">Plano e uso</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Veja seu plano atual, limites e contagem de pedidos do dia.
          </p>
        </Link>

        {session.isSuperAdmin ? (
          <Link
            className="flex flex-col gap-2 rounded-lg border-2 border-primary/40 bg-primary/5 p-4 shadow-sm transition hover:border-primary hover:shadow"
            href="/admin"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold">Painel admin (SaaS)</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Métricas globais, gestão de tenants e ações de super admin.
            </p>
          </Link>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <header>
          <h2 className="text-sm font-semibold">Do café</h2>
        </header>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm transition hover:border-primary hover:shadow"
                href={section.href}
                key={section.href}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">{section.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </Link>
            );
          })}
          <article className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Cozinha</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Notas padrão e tempo de preparo ainda não existem na API.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
