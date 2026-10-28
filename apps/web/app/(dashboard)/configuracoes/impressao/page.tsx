import { BackLink } from '@/components/layout/back-link';

import { PrintersContainer } from '@/features/configuracoes/containers/printers-container';

export default function PrinterSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <BackLink href="/configuracoes">Configurações</BackLink>
        <div>
          <h1 className="text-2xl font-semibold">Impressão térmica</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre a impressora e copie o token para o agente. Ele não volta a aparecer.
          </p>
        </div>
      </header>
      <PrintersContainer />
    </div>
  );
}
