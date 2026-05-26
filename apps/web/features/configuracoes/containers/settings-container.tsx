'use client';

import { BookOpen, Building2, ChefHat, Mail, Printer, ShieldCheck, Truck, UserCircle } from 'lucide-react';

import { useSessionUI } from '@/features/auth/context/session-ui-provider';

const roleLabel: Record<NonNullable<ReturnType<typeof useSessionUI>['role']>, string> = {
  owner: 'Proprietário',
  manager: 'Gerente',
  attendant: 'Atendente',
  kitchen: 'Cozinha',
};

const futureSections = [
  {
    icon: Building2,
    title: 'Dados do café',
    description:
      'Razão social, endereço, horário de funcionamento e taxa de entrega padrão (em desenvolvimento).',
  },
  {
    icon: ShieldCheck,
    title: 'Equipe e permissões',
    description: 'Convite de membros, papéis e gestão de acesso (em desenvolvimento).',
  },
  {
    icon: Printer,
    title: 'Impressão térmica',
    description: 'Status do agente de impressão e configuração de impressoras (em desenvolvimento).',
  },
  {
    icon: Truck,
    title: 'Delivery',
    description: 'Habilitar/desabilitar delivery, horários e raio de entrega (em desenvolvimento).',
  },
  {
    icon: BookOpen,
    title: 'Cardápio padrão',
    description: 'Categorias, produtos e adicionais (já disponível em Cardápio).',
  },
  {
    icon: ChefHat,
    title: 'Cozinha',
    description: 'Notas padrão e tempos médios de preparo (em desenvolvimento).',
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
            <dd>{role ? roleLabel[role] : 'Sem função'}</dd>
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
      </section>

      <section className="flex flex-col gap-3">
        <header>
          <h2 className="text-sm font-semibold">Em breve</h2>
          <p className="text-xs text-muted-foreground">
            Estas áreas serão configuráveis pela UI conforme os módulos forem amadurecendo.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {futureSections.map((section) => {
            const Icon = section.icon;
            return (
              <article
                className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/30 p-4"
                key={section.title}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">{section.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
