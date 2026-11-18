import { TablesGridContainer } from '@/features/mesas/containers/tables-grid-container';

export default function TablesPage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Mesas</h1>
        <p className="text-sm text-muted-foreground">Mapa operacional das mesas do salão.</p>
      </header>
      <TablesGridContainer />
    </div>
  );
}
