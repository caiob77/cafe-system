'use client';

import { Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ApiError } from '@/lib/api-client';

import { priceInputToApi } from '@/features/cardapio/utils/format-price';

import { useDeliverySettings, useUpdateDeliverySettings } from '../api/use-delivery-settings';
import type { DeliverySchedule, WeekdayKey } from '../types';

const WEEKDAYS: Array<{ key: WeekdayKey; label: string }> = [
  { key: 'sun', label: 'Domingo' },
  { key: 'mon', label: 'Segunda' },
  { key: 'tue', label: 'Terça' },
  { key: 'wed', label: 'Quarta' },
  { key: 'thu', label: 'Quinta' },
  { key: 'fri', label: 'Sexta' },
  { key: 'sat', label: 'Sábado' },
];

function emptySchedule(): DeliverySchedule {
  return {
    sun: null,
    mon: { open: '06:00', close: '11:00' },
    tue: { open: '06:00', close: '11:00' },
    wed: { open: '06:00', close: '11:00' },
    thu: { open: '06:00', close: '11:00' },
    fri: { open: '06:00', close: '11:00' },
    sat: { open: '06:00', close: '11:00' },
  };
}

export function DeliverySettingsContainer() {
  const settingsQuery = useDeliverySettings();
  const updateSettings = useUpdateDeliverySettings();
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState('');
  const [schedule, setSchedule] = useState<DeliverySchedule>(emptySchedule());
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) return;
    setDeliveryEnabled(settings.deliveryEnabled);
    setDefaultDeliveryFee(settings.defaultDeliveryFee ?? '');
    setSchedule(settings.deliverySchedule ?? emptySchedule());
  }, [settingsQuery.data]);

  function updateDay(day: WeekdayKey, field: 'open' | 'close', value: string) {
    setSchedule((current) => ({
      ...current,
      [day]: {
        open: current[day]?.open ?? '06:00',
        close: current[day]?.close ?? '11:00',
        [field]: value,
      },
    }));
  }

  function toggleDay(day: WeekdayKey, enabled: boolean) {
    setSchedule((current) => ({
      ...current,
      [day]: enabled ? (current[day] ?? { open: '06:00', close: '11:00' }) : null,
    }));
  }

  async function handleSave() {
    setError(null);
    setSaved(false);
    try {
      await updateSettings.mutateAsync({
        deliveryEnabled,
        defaultDeliveryFee:
          defaultDeliveryFee.trim().length > 0 ? priceInputToApi(defaultDeliveryFee) : null,
        deliverySchedule: schedule,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar as configurações.');
    }
  }

  if (settingsQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Operação do delivery</h2>
          <p className="text-xs text-muted-foreground">
            Controle a disponibilidade, taxa padrão e horários de recebimento.
          </p>
        </div>
        <Switch checked={deliveryEnabled} onCheckedChange={setDeliveryEnabled} />
      </div>

      {error ? <Alert variant="destructive">{error}</Alert> : null}
      {saved ? <Alert>Configurações salvas.</Alert> : null}

      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="default-delivery-fee">Taxa padrão</Label>
        <Input
          id="default-delivery-fee"
          inputMode="decimal"
          onChange={(event) => setDefaultDeliveryFee(event.target.value)}
          placeholder="5,00"
          value={defaultDeliveryFee}
        />
      </div>

      <div className="flex flex-col gap-2">
        {WEEKDAYS.map((day) => {
          const window = schedule[day.key];
          return (
            <div
              className="grid grid-cols-1 items-center gap-3 rounded-md border bg-background p-3 md:grid-cols-[120px_1fr_auto_auto]"
              key={day.key}
            >
              <Label className="text-sm">{day.label}</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={window !== null}
                  onCheckedChange={(checked) => toggleDay(day.key, checked)}
                />
                <span className="text-xs text-muted-foreground">
                  {window ? 'Aberto' : 'Fechado'}
                </span>
              </div>
              <Input
                disabled={!window}
                onChange={(event) => updateDay(day.key, 'open', event.target.value)}
                type="time"
                value={window?.open ?? '06:00'}
              />
              <Input
                disabled={!window}
                onChange={(event) => updateDay(day.key, 'close', event.target.value)}
                type="time"
                value={window?.close ?? '11:00'}
              />
            </div>
          );
        })}
      </div>

      <div>
        <Button disabled={updateSettings.isPending} onClick={handleSave} type="button">
          {updateSettings.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar configurações
        </Button>
      </div>
    </section>
  );
}
