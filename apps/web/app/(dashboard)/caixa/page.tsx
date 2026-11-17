import { redirect } from 'next/navigation';

import { canAccessRoute } from '@/features/auth/utils/can-access-route';
import { CashRegisterContainer } from '@/features/caixa/containers/cash-register-container';
import { getCurrentUser } from '@/lib/server-api';

export default async function CashRegisterPage() {
  const session = await getCurrentUser();
  if (!session || !canAccessRoute('/caixa', session.data.role)) {
    redirect('/pedidos');
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Caixa</h1>
        <p className="text-sm text-muted-foreground">
          Abertura, movimentos e fechamento do caixa do expediente.
        </p>
      </header>
      <CashRegisterContainer />
    </div>
  );
}
