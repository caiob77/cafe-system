'use client';

import { ArrowLeft, ArrowRight, Check, Copy, Loader2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ApiError, apiClient } from '@/lib/api-client';

type WeekdayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
type DeliveryWindow = { open: string; close: string };
type DeliverySchedule = Record<WeekdayKey, DeliveryWindow | null>;

const WEEKDAYS: Array<{ key: WeekdayKey; label: string }> = [
  { key: 'sun', label: 'Domingo' },
  { key: 'mon', label: 'Segunda' },
  { key: 'tue', label: 'Terça' },
  { key: 'wed', label: 'Quarta' },
  { key: 'thu', label: 'Quinta' },
  { key: 'fri', label: 'Sexta' },
  { key: 'sat', label: 'Sábado' },
];

function defaultSchedule(): DeliverySchedule {
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

type WizardInitial = {
  name: string;
  slug: string;
  logo: string | null;
  addressLine: string | null;
  phone: string | null;
  deliveryEnabled: boolean;
  deliverySchedule: Record<string, { open: string; close: string } | null> | null;
};

type DeliveryFeeRow = { id: string; neighborhood: string; fee: string };

const TOTAL_STEPS = 5;

export function SetupWizard({ initial }: { initial: WizardInitial }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [logo, setLogo] = useState(initial.logo ?? '');
  const [addressLine, setAddressLine] = useState(initial.addressLine ?? '');
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [tableCount, setTableCount] = useState('8');

  const [deliveryEnabled, setDeliveryEnabled] = useState(initial.deliveryEnabled);
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState('0.00');
  const [schedule, setSchedule] = useState<DeliverySchedule>(() => {
    if (!initial.deliverySchedule) return defaultSchedule();
    const base = defaultSchedule();
    for (const day of WEEKDAYS) {
      const incoming = initial.deliverySchedule[day.key];
      base[day.key] = incoming ?? null;
    }
    return base;
  });
  const [deliveryFees, setDeliveryFees] = useState<DeliveryFeeRow[]>([]);

  const [printerName, setPrinterName] = useState('Impressora principal');

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [printerToken, setPrinterToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

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

  function addDeliveryFee() {
    setDeliveryFees((rows) => [...rows, { id: crypto.randomUUID(), neighborhood: '', fee: '' }]);
  }

  function updateDeliveryFee(id: string, field: 'neighborhood' | 'fee', value: string) {
    setDeliveryFees((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  function removeDeliveryFee(id: string) {
    setDeliveryFees((rows) => rows.filter((row) => row.id !== id));
  }

  async function persistLogoStep() {
    const trimmed = logo.trim();
    if (trimmed.length === 0) return;
    await apiClient('/api/v1/organization/profile', {
      method: 'PATCH',
      body: JSON.stringify({ logo: trimmed }),
    });
  }

  async function handleNext() {
    setError(null);
    setSaving(true);
    try {
      if (step === 1) {
        await persistLogoStep();
      }
      setStep((current) => (current < TOTAL_STEPS ? ((current + 1) as typeof current) : current));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível continuar.');
    } finally {
      setSaving(false);
    }
  }

  function parsedTableCount(): number | undefined {
    const value = tableCount.trim();
    if (value === '') return 0;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
  }

  function normalizedDeliveryFees() {
    return deliveryFees
      .map((row) => ({ neighborhood: row.neighborhood.trim(), fee: row.fee.trim() }))
      .filter((row) => row.neighborhood.length > 0 && row.fee.length > 0);
  }

  function validateBeforeFinish(): string | null {
    if (parsedTableCount() === undefined) {
      return 'Quantidade de mesas inválida.';
    }
    if (deliveryEnabled && defaultDeliveryFee.trim().length > 0) {
      if (!/^\d+(\.\d{1,2})?$/.test(defaultDeliveryFee.trim().replace(',', '.'))) {
        return 'Taxa padrão de delivery inválida.';
      }
    }
    for (const fee of normalizedDeliveryFees()) {
      if (!/^\d+(\.\d{1,2})?$/.test(fee.fee.replace(',', '.'))) {
        return `Taxa do bairro "${fee.neighborhood}" inválida.`;
      }
    }
    if (printerName.trim().length > 0 && printerName.trim().length < 2) {
      return 'Nome da impressora muito curto.';
    }
    return null;
  }

  async function handleFinish() {
    const validation = validateBeforeFinish();
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        addressLine: addressLine.trim().length > 0 ? addressLine.trim() : null,
        phone: phone.trim().length > 0 ? phone.trim() : null,
        tableCount: parsedTableCount() ?? 0,
        deliveryEnabled,
        deliverySchedule: deliveryEnabled ? schedule : null,
        defaultDeliveryFee: deliveryEnabled
          ? defaultDeliveryFee.trim().length > 0
            ? defaultDeliveryFee.trim().replace(',', '.')
            : null
          : null,
        deliveryFees: deliveryEnabled
          ? normalizedDeliveryFees().map((f) => ({
              neighborhood: f.neighborhood,
              fee: f.fee.replace(',', '.'),
            }))
          : [],
        printer: printerName.trim().length > 0 ? { name: printerName.trim() } : null,
      };

      const response = await apiClient<{
        data: { printer: { id: string; name: string; token: string } | null };
      }>('/api/v1/organization/complete-setup', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (response.data.printer?.token) {
        setPrinterToken(response.data.printer.token);
      } else {
        router.replace('/pedidos');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível concluir o setup.');
    } finally {
      setSaving(false);
    }
  }

  async function copyTokenAndExit() {
    if (printerToken) {
      try {
        await navigator.clipboard.writeText(printerToken);
        setTokenCopied(true);
      } catch {
        setTokenCopied(false);
      }
    }
  }

  function exitToDashboard() {
    router.replace('/pedidos');
    router.refresh();
  }

  if (printerToken) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Setup concluído
          </p>
          <h1 className="text-2xl font-semibold">Guarde o token da impressora agora</h1>
          <p className="text-sm text-muted-foreground">
            Esse token só aparece uma vez. Configure-o no print-agent local antes de sair.
          </p>
        </header>
        <Alert variant="destructive">
          O token não pode ser recuperado depois. Se perder, você precisa revogar a impressora e
          cadastrar uma nova em Configurações.
        </Alert>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium">Token da impressora</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-stretch gap-2">
              <code className="flex-1 select-all break-all rounded-md border bg-muted/40 p-3 font-mono text-xs">
                {printerToken}
              </code>
              <Button onClick={copyTokenAndExit} type="button" variant="secondary">
                <Copy className="h-4 w-4" />
                {tokenCopied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No <code>.env</code> do print-agent:{' '}
              <code className="font-mono">PRINTER_TOKEN={printerToken}</code>
            </p>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button onClick={exitToDashboard} type="button">
            <Check className="h-4 w-4" />
            Já guardei, ir para o painel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Passo {step} de {TOTAL_STEPS}
        </p>
        <h1 className="text-2xl font-semibold">Configurar {initial.name}</h1>
        <p className="text-sm text-muted-foreground">
          Preencha os dados iniciais antes de começar a operar.
        </p>
      </header>

      <div className="flex gap-1">
        {Array.from({ length: TOTAL_STEPS }, (_, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: barra de progresso fixa
            key={index}
            className={`h-1 flex-1 rounded-full ${step > index ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      {error ? <Alert variant="destructive">{error}</Alert> : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium">Logo</h2>
            <p className="text-sm text-muted-foreground">
              Cole a URL pública da imagem do seu café. Pode pular e configurar depois.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="logo">URL do logo</Label>
              <Input
                id="logo"
                onChange={(event) => setLogo(event.target.value)}
                placeholder="https://..."
                type="url"
                value={logo}
              />
            </div>
            {logo.trim().length > 0 ? (
              <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Pré-visualização do logo"
                  className="h-16 w-16 rounded-md object-cover"
                  onError={(event) => {
                    (event.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                  src={logo.trim()}
                />
                <div className="text-xs text-muted-foreground">
                  Pré-visualização. Se nada aparecer, verifique a URL.
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium">Endereço e telefone</h2>
            <p className="text-sm text-muted-foreground">
              Informações que aparecem em comandas e cupons.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                onChange={(event) => setAddressLine(event.target.value)}
                placeholder="Rua, número - Bairro - CEP"
                value={addressLine}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="(92) 90000-0000"
                value={phone}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium">Mesas</h2>
            <p className="text-sm text-muted-foreground">
              Quantas mesas o café tem? O sistema cria essa quantidade numerada de 1 a N.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-[160px] space-y-2">
              <Label htmlFor="table-count">Quantidade</Label>
              <Input
                id="table-count"
                inputMode="numeric"
                min={0}
                onChange={(event) => setTableCount(event.target.value.replace(/\D/g, ''))}
                type="text"
                value={tableCount}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Coloque 0 se quiser cadastrar manualmente depois (ex: só delivery).
            </p>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium">Delivery</h2>
            <p className="text-sm text-muted-foreground">
              Ative o delivery, configure horários, taxa padrão e taxas por bairro.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border bg-background p-3">
              <div>
                <p className="text-sm font-medium">Ativar delivery</p>
                <p className="text-xs text-muted-foreground">
                  Quando desligado, o sistema não aceita novos pedidos delivery.
                </p>
              </div>
              <Switch checked={deliveryEnabled} onCheckedChange={setDeliveryEnabled} />
            </div>

            {deliveryEnabled ? (
              <>
                <div className="max-w-[200px] space-y-2">
                  <Label htmlFor="default-fee">Taxa padrão</Label>
                  <Input
                    id="default-fee"
                    inputMode="decimal"
                    onChange={(event) => setDefaultDeliveryFee(event.target.value)}
                    placeholder="0.00"
                    value={defaultDeliveryFee}
                  />
                  <p className="text-xs text-muted-foreground">
                    Usada quando o bairro não tem taxa específica abaixo.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Horários por dia</p>
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
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Taxas por bairro (opcional)</p>
                      <p className="text-xs text-muted-foreground">
                        Sobrescrevem a taxa padrão para bairros listados.
                      </p>
                    </div>
                    <Button onClick={addDeliveryFee} size="sm" type="button" variant="secondary">
                      <Plus className="h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                  {deliveryFees.length === 0 ? (
                    <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                      Nenhuma taxa por bairro. Apenas a taxa padrão será usada.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {deliveryFees.map((row) => (
                        <div className="grid grid-cols-[1fr_120px_auto] gap-2" key={row.id}>
                          <Input
                            onChange={(event) =>
                              updateDeliveryFee(row.id, 'neighborhood', event.target.value)
                            }
                            placeholder="Nome do bairro"
                            value={row.neighborhood}
                          />
                          <Input
                            inputMode="decimal"
                            onChange={(event) =>
                              updateDeliveryFee(row.id, 'fee', event.target.value)
                            }
                            placeholder="0.00"
                            value={row.fee}
                          />
                          <Button
                            onClick={() => removeDeliveryFee(row.id)}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {step === 5 ? (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium">Impressora</h2>
            <p className="text-sm text-muted-foreground">
              Cadastre a impressora térmica da cozinha. O token de acesso aparece uma única vez na
              próxima tela.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="printer-name">Nome da impressora</Label>
              <Input
                id="printer-name"
                onChange={(event) => setPrinterName(event.target.value)}
                placeholder="Impressora principal"
                value={printerName}
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio se não tem impressora agora. Pode cadastrar depois em Configurações.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-between">
        <Button
          disabled={step === 1 || saving}
          onClick={() => setStep((current) => Math.max(1, current - 1) as typeof current)}
          type="button"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        {step < TOTAL_STEPS ? (
          <Button disabled={saving} onClick={handleNext} type="button">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Avançar
          </Button>
        ) : (
          <Button disabled={saving} onClick={handleFinish} type="button">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Concluir setup
          </Button>
        )}
      </div>
    </div>
  );
}
