import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { CustomersListContainer } from '@/features/clientes/containers/customers-list-container';
import { DeliveryFeesContainer } from '@/features/delivery/containers/delivery-fees-container';
import { DeliveryOrdersContainer } from '@/features/delivery/containers/delivery-orders-container';
import { DeliverySettingsContainer } from '@/features/delivery/containers/delivery-settings-container';
import { NewDeliveryOrderContainer } from '@/features/delivery/containers/new-delivery-order-container';

export default function DeliveryPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Delivery</h1>
        <p className="text-sm text-muted-foreground">
          Pedidos de entrega, base de clientes e taxas por bairro.
        </p>
      </header>
      <Tabs defaultValue="new">
        <TabsList>
          <TabsTrigger value="new">Novo pedido</TabsTrigger>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="fees">Taxas por bairro</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>
        <TabsContent value="new">
          <NewDeliveryOrderContainer />
        </TabsContent>
        <TabsContent value="orders">
          <DeliveryOrdersContainer />
        </TabsContent>
        <TabsContent value="customers">
          <CustomersListContainer />
        </TabsContent>
        <TabsContent value="fees">
          <DeliveryFeesContainer />
        </TabsContent>
        <TabsContent value="settings">
          <DeliverySettingsContainer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
