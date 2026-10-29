'use client';

import { Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatPrice } from '@/features/cardapio/utils/format-price';
import { cn } from '@/lib/utils';

import { cartItemTotal, itemCountLabel } from '../cart';
import type { PublicCartItem, PublicCustomerForm } from '../types';
import { type RequiredCustomerField, customerLimits } from '../validation';

export type FeeView =
  | { status: 'known'; amount: number }
  | { status: 'pending' }
  | { status: 'unsupported' };

type OrderPanelProps = {
  className?: string;
  step: 'items' | 'delivery';
  cart: PublicCartItem[];
  customer: PublicCustomerForm;
  neighborhoodMode: 'list' | 'text';
  neighborhoods: Array<{ id: string; neighborhood: string; fee: string }>;
  fee: FeeView;
  subtotal: number;
  deliveryBlocked: boolean;
  fieldErrors: Partial<Record<RequiredCustomerField, string>>;
  submitError: string | null;
  reviewTick: number;
  submitting: boolean;
  showClose: boolean;
  onClose: () => void;
  onRemove: (tempId: string) => void;
  onChange: (field: keyof PublicCustomerForm, value: string) => void;
  onBlurField: (field: RequiredCustomerField, value: string) => void;
  onContinue: () => void;
  onBack: () => void;
  onSubmit: () => void;
};

const fieldClass = 'h-12 text-base shadow-none';

const primaryButton =
  'inline-flex h-12 w-full items-center justify-center bg-primary px-4 text-base font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50';

export function OrderPanel({
  className,
  step,
  cart,
  customer,
  neighborhoodMode,
  neighborhoods,
  fee,
  subtotal,
  deliveryBlocked,
  fieldErrors,
  submitError,
  reviewTick,
  submitting,
  showClose,
  onClose,
  onRemove,
  onChange,
  onBlurField,
  onContinue,
  onBack,
  onSubmit,
}: OrderPanelProps) {
  const summaryRef = useRef<HTMLDivElement>(null);
  const problems = (Object.entries(fieldErrors) as Array<[RequiredCustomerField, string]>).filter(
    ([, message]) => Boolean(message),
  );
  const units = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = subtotal + (fee.status === 'known' ? fee.amount : 0);
  const canContinue = cart.length > 0 && !deliveryBlocked;
  const canSubmit = canContinue && fee.status !== 'unsupported' && !submitting;

  useEffect(() => {
    if (reviewTick === 0) return;
    summaryRef.current?.focus();
  }, [reviewTick]);

  return (
    <aside
      className={cn(
        'flex h-dvh flex-col bg-background lg:sticky lg:top-0 lg:border-l lg:border-[hsl(var(--line))]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[hsl(var(--line))] px-4 py-4">
        <h2 className="text-lg font-semibold">{step === 'items' ? 'Seu pedido' : 'Entrega'}</h2>
        {showClose ? (
          <button
            className="inline-flex h-11 items-center px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
        ) : null}
      </div>

      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (step === 'items') onContinue();
          else onSubmit();
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {step === 'delivery' ? (
            <button
              className="mb-4 inline-flex h-11 items-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onBack}
              type="button"
            >
              Voltar ao pedido
            </button>
          ) : null}

          {reviewTick > 0 && (problems.length > 0 || submitError) ? (
            <div
              aria-labelledby="store-error-title"
              className="mb-4 border border-destructive p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              ref={summaryRef}
              role="alert"
              tabIndex={-1}
            >
              <p className="font-semibold" id="store-error-title">
                O pedido ainda não foi enviado.
              </p>
              <ul className="mt-2 space-y-1">
                {problems.map(([field, message]) => (
                  <li key={field}>
                    <button
                      className="text-left underline-offset-2 hover:underline"
                      onClick={() => document.getElementById(fieldId(field))?.focus()}
                      type="button"
                    >
                      {message}
                    </button>
                  </li>
                ))}
                {submitError ? <li>{submitError}</li> : null}
              </ul>
            </div>
          ) : null}

          {step === 'items' ? (
            <CartLines cart={cart} onRemove={onRemove} />
          ) : (
            <DeliveryFields
              customer={customer}
              errors={fieldErrors}
              neighborhoodMode={neighborhoodMode}
              neighborhoods={neighborhoods}
              onBlurField={onBlurField}
              onChange={onChange}
            />
          )}
        </div>

        <div className="border-t border-[hsl(var(--line))] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Totals fee={fee} subtotal={subtotal} total={total} />
          {deliveryBlocked ? (
            <p className="mt-3 text-sm">O delivery está fechado. Não dá para enviar agora.</p>
          ) : null}
          {step === 'items' ? (
            <button className={cn(primaryButton, 'mt-4')} disabled={!canContinue} type="submit">
              Continuar
            </button>
          ) : (
            <button className={cn(primaryButton, 'mt-4')} disabled={!canSubmit} type="submit">
              {submitting ? 'Enviando pedido' : 'Enviar pedido'}
            </button>
          )}
          {cart.length > 0 && step === 'items' ? (
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {itemCountLabel(units)}
            </p>
          ) : null}
        </div>
      </form>
    </aside>
  );
}

function CartLines({
  cart,
  onRemove,
}: {
  cart: PublicCartItem[];
  onRemove: (tempId: string) => void;
}) {
  if (cart.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum item ainda. Escolha algo no cardápio.</p>
    );
  }

  return (
    <ul>
      {cart.map((item) => (
        <li className="border-b border-[hsl(var(--line))] py-3" key={item.tempId}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold">
              {item.quantity} × {item.productName}
            </p>
            <p className="shrink-0 text-sm font-semibold tabular-nums">
              {formatPrice(cartItemTotal(item))}
            </p>
          </div>
          {item.addons.length > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {item.addons.map((addon) => `${addon.quantity} × ${addon.name}`).join(', ')}
              {item.quantity > 1 ? ' (cada)' : ''}
            </p>
          ) : null}
          {item.notes ? <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p> : null}
          <button
            className="mt-1 inline-flex h-11 items-center gap-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onRemove(item.tempId)}
            type="button"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Remover
          </button>
        </li>
      ))}
    </ul>
  );
}

function DeliveryFields({
  customer,
  errors,
  neighborhoodMode,
  neighborhoods,
  onChange,
  onBlurField,
}: {
  customer: PublicCustomerForm;
  errors: Partial<Record<RequiredCustomerField, string>>;
  neighborhoodMode: 'list' | 'text';
  neighborhoods: Array<{ id: string; neighborhood: string; fee: string }>;
  onChange: (field: keyof PublicCustomerForm, value: string) => void;
  onBlurField: (field: RequiredCustomerField, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Field error={errors.name} id="store-name" label="Nome">
        <Input
          aria-describedby={errors.name ? 'store-name-error' : undefined}
          aria-invalid={Boolean(errors.name)}
          aria-required="true"
          autoComplete="name"
          className={fieldClass}
          id="store-name"
          maxLength={customerLimits.name}
          onBlur={(event) => onBlurField('name', event.target.value)}
          onChange={(event) => onChange('name', event.target.value)}
          value={customer.name}
        />
      </Field>
      <Field error={errors.phone} id="store-phone" label="Telefone">
        <Input
          aria-describedby={errors.phone ? 'store-phone-error' : undefined}
          aria-invalid={Boolean(errors.phone)}
          aria-required="true"
          autoComplete="tel"
          className={fieldClass}
          id="store-phone"
          inputMode="tel"
          maxLength={customerLimits.phone}
          onBlur={(event) => onBlurField('phone', event.target.value)}
          onChange={(event) => onChange('phone', event.target.value)}
          value={customer.phone}
        />
      </Field>
      <Field error={errors.address} id="store-address" label="Endereço">
        <Input
          aria-describedby={errors.address ? 'store-address-error' : undefined}
          aria-invalid={Boolean(errors.address)}
          aria-required="true"
          autoComplete="street-address"
          className={fieldClass}
          id="store-address"
          maxLength={customerLimits.address}
          onBlur={(event) => onBlurField('address', event.target.value)}
          onChange={(event) => onChange('address', event.target.value)}
          value={customer.address}
        />
      </Field>
      <Field error={errors.neighborhood} id="store-neighborhood" label="Bairro">
        {neighborhoodMode === 'list' ? (
          <Select
            aria-describedby={errors.neighborhood ? 'store-neighborhood-error' : undefined}
            aria-invalid={Boolean(errors.neighborhood)}
            aria-required="true"
            className={fieldClass}
            id="store-neighborhood"
            onBlur={(event) => onBlurField('neighborhood', event.target.value)}
            onChange={(event) => onChange('neighborhood', event.target.value)}
            value={customer.neighborhood}
          >
            <option value="">Selecione o bairro</option>
            {neighborhoods.map((entry) => (
              <option key={entry.id} value={entry.neighborhood}>
                {entry.neighborhood}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            aria-describedby={errors.neighborhood ? 'store-neighborhood-error' : undefined}
            aria-invalid={Boolean(errors.neighborhood)}
            aria-required="true"
            className={fieldClass}
            id="store-neighborhood"
            maxLength={customerLimits.neighborhood}
            onBlur={(event) => onBlurField('neighborhood', event.target.value)}
            onChange={(event) => onChange('neighborhood', event.target.value)}
            value={customer.neighborhood}
          />
        )}
      </Field>
      <Field id="store-reference" label="Ponto de referência">
        <Input
          className={fieldClass}
          id="store-reference"
          maxLength={customerLimits.reference}
          onChange={(event) => onChange('reference', event.target.value)}
          value={customer.reference}
        />
      </Field>
      <Field id="store-notes" label="Observação">
        <Textarea
          className="min-h-20 text-base shadow-none"
          id="store-notes"
          maxLength={customerLimits.notes}
          onChange={(event) => onChange('notes', event.target.value)}
          rows={3}
          value={customer.notes}
        />
      </Field>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Totals({ fee, subtotal, total }: { fee: FeeView; subtotal: number; total: number }) {
  const delivery =
    fee.status === 'known'
      ? formatPrice(fee.amount)
      : fee.status === 'pending'
        ? 'Informe o bairro'
        : 'Fora da área';

  return (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="tabular-nums">{formatPrice(subtotal)}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">Entrega</span>
        <span className="tabular-nums">{delivery}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3 pt-2">
        <span className="font-semibold">{fee.status === 'known' ? 'Total' : 'Total parcial'}</span>
        <span className="font-display text-2xl font-semibold leading-none tabular-nums">
          {formatPrice(total)}
        </span>
      </div>
    </div>
  );
}

function fieldId(field: RequiredCustomerField) {
  if (field === 'name') return 'store-name';
  if (field === 'phone') return 'store-phone';
  if (field === 'address') return 'store-address';
  return 'store-neighborhood';
}
