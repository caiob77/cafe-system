import { MenuSquare } from 'lucide-react';

import { SectionPage } from '@/components/layout/section-page';

export default function OrdersPage() {
  return (
    <SectionPage
      description="Acompanhamento dos pedidos do dia."
      icon={MenuSquare}
      title="Pedidos"
    />
  );
}
