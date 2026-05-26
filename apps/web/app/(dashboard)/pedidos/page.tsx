import { OrdersKanbanContainer } from '@/features/pedidos/containers/orders-kanban-container';

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhamento em tempo real dos pedidos do dia. Atualiza automaticamente.
        </p>
      </header>
      <OrdersKanbanContainer />
    </div>
  );
}
