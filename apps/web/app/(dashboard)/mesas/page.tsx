import { TablesGridContainer } from '@/features/mesas/containers/tables-grid-container';

export default function TablesPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Mesas</h1>
        <p className="text-sm text-muted-foreground">Mapa operacional das mesas do salão.</p>
      </header>
      <TablesGridContainer />
    </div>
  );
}
