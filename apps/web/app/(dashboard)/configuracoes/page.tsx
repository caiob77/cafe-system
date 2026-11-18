import { SettingsContainer } from '@/features/configuracoes/containers/settings-container';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Sua conta, o café ativo e as configurações que a API já aceita.
        </p>
      </header>
      <SettingsContainer />
    </div>
  );
}
