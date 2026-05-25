import { BookOpen } from 'lucide-react';

import { SectionPage } from '@/components/layout/section-page';

export default function MenuPage() {
  return (
    <SectionPage
      description="Categorias, produtos e adicionais."
      icon={BookOpen}
      title="Cardápio"
    />
  );
}
