import { BackLink } from '@/components/layout/back-link';

import { CafeProfileContainer } from '@/features/configuracoes/containers/cafe-profile-container';

export default function CafeSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <BackLink href="/configuracoes">Configurações</BackLink>
        <div>
          <h1 className="text-2xl font-semibold">Dados do café</h1>
          <p className="text-sm text-muted-foreground">
            Nome, contato, endereço e a cor usada no botão da loja pública.
          </p>
        </div>
      </header>
      <CafeProfileContainer />
    </div>
  );
}
