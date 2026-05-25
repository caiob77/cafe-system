import { ChefHat } from 'lucide-react';

import { SectionPage } from '@/components/layout/section-page';

export default function KitchenPage() {
  return (
    <SectionPage description="Pedidos enviados para preparo." icon={ChefHat} title="Cozinha" />
  );
}
