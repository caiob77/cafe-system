import { CreditCard } from 'lucide-react';

import { SectionPage } from '@/components/layout/section-page';

export default function CashRegisterPage() {
  return (
    <SectionPage description="Abertura, movimentos e fechamento." icon={CreditCard} title="Caixa" />
  );
}
