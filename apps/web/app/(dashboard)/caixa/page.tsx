import { CashRegisterContainer } from '@/features/caixa/containers/cash-register-container';

export default function CashRegisterPage() {
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
