import { OrdersKanbanContainer } from '@/features/pedidos/containers/orders-kanban-container';

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Pedidos</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhamento em tempo real dos pedidos do dia. Atualiza automaticamente.
        </p>
      </header>
      <OrdersKanbanContainer />
    </div>
  );
}
