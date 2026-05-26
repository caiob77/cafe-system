'use client';

import { CreditCard, Loader2, LockKeyhole, Plus } from 'lucide-react';
import { useState } from 'react';

import { CashRegisterSummaryCard } from '@/components/caixa/cash-register-summary';
import { CloseRegisterDialog } from '@/components/caixa/close-register-dialog';
import { MovementDialog } from '@/components/caixa/movement-dialog';
import { MovementsList } from '@/components/caixa/movements-list';
import { OpenRegisterForm } from '@/components/caixa/open-register-form';
import { Button } from '@/components/ui/button';

import { useCurrentCashRegister } from '../api/use-cash-register';

export function CashRegisterContainer() {
  const currentQuery = useCurrentCashRegister();
  const [movementOpen, setMovementOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  if (currentQuery.isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const register = currentQuery.data;

  if (!register) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-base font-semibold">Caixa fechado</h2>
            <p className="text-sm text-muted-foreground">
              Abra o caixa informando o valor inicial em dinheiro para começar o expediente.
            </p>
          </div>
        </div>
        <OpenRegisterForm />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Caixa aberto</h2>
          <p className="text-sm text-muted-foreground">
            Você pode registrar sangrias/suprimentos a qualquer momento e fechar o caixa no fim do
            expediente.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setMovementOpen(true)} size="sm" variant="secondary">
            <Plus className="h-4 w-4" />
            Movimento
          </Button>
          <Button onClick={() => setCloseOpen(true)} size="sm" variant="destructive">
            <LockKeyhole className="h-4 w-4" />
            Fechar caixa
          </Button>
        </div>
      </div>

      <CashRegisterSummaryCard register={register} />

      <section className="flex flex-col gap-2">
        <header className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Movimentos do caixa</h3>
          <span className="text-xs text-muted-foreground">{register.movements.length} registros</span>
        </header>
        <MovementsList movements={register.movements} />
      </section>

      <MovementDialog
        onOpenChange={setMovementOpen}
        open={movementOpen}
        registerId={register.id}
      />
      <CloseRegisterDialog
        onOpenChange={setCloseOpen}
        open={closeOpen}
        register={register}
      />
    </div>
  );
}
