import { SettingsContainer } from '@/features/configuracoes/containers/settings-container';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Sua conta, o café ativo e áreas de configuração futuras.
        </p>
      </header>
      <SettingsContainer />
    </div>
  );
}
