import { KitchenBoardContainer } from '@/features/cozinha/containers/kitchen-board-container';

export default function KitchenPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Cozinha</h1>
        <p className="text-sm text-muted-foreground">
          Pedidos em preparo. Avance o status conforme finaliza cada etapa.
        </p>
      </header>
      <KitchenBoardContainer />
    </div>
  );
}
