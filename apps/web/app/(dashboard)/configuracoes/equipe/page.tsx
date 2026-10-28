import { BackLink } from '@/components/layout/back-link';

import { TeamContainer } from '@/features/configuracoes/containers/team-container';

export default function TeamSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <BackLink href="/configuracoes">Configurações</BackLink>
        <div>
          <h1 className="text-2xl font-semibold">Equipe e permissões</h1>
          <p className="text-sm text-muted-foreground">Quem acessa este café e com qual papel.</p>
        </div>
      </header>
      <TeamContainer />
    </div>
  );
}
