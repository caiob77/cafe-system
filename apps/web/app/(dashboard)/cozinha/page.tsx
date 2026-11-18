import { KitchenBoardContainer } from '@/features/cozinha/containers/kitchen-board-container';

export default function KitchenPage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Cozinha</h1>
        <p className="text-sm text-muted-foreground">
          Pedidos em preparo. Avance o status conforme finaliza cada etapa.
        </p>
      </header>
      <KitchenBoardContainer />
    </div>
  );
}
