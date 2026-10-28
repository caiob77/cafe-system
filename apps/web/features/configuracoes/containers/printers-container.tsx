'use client';

import { Copy, Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-client';

import { useCreatePrinter, usePrinters, useRevokePrinter } from '../api/use-printers';
import type { CreatedPrinterDevice } from '../types';

function formatWhen(value: string | null) {
  if (!value) return 'Ainda não conectou';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function PrintersContainer() {
  const printersQuery = usePrinters();
  const createPrinter = useCreatePrinter();
  const revokePrinter = useRevokePrinter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedPrinterDevice | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    setError(null);
    setCopied(false);
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Dê um nome com pelo menos 2 caracteres.');
      return;
    }

    try {
      const device = await createPrinter.mutateAsync(trimmed);
      setCreated(device);
      setName('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar a impressora.');
    }
  }

  async function handleRevoke(id: string) {
    setError(null);
    try {
      await revokePrinter.mutateAsync(id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível revogar a impressora.');
    }
  }

  async function copyToken() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.token);
      setCopied(true);
    } catch {
      setCopied(false);
      setError('Não foi possível copiar. Selecione o token e copie manualmente.');
    }
  }

  if (printersQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (printersQuery.isError) {
    return <Alert variant="destructive">Não foi possível carregar as impressoras.</Alert>;
  }

  const devices = printersQuery.data ?? [];

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      {created ? (
        <Alert>
          <p className="font-medium">Token de {created.name}</p>
          <p className="mt-1 text-xs">Guarde agora. A API não mostra esse token de novo.</p>
          <p className="mt-2 break-all font-mono text-xs">{created.token}</p>
          <Button
            className="mt-3"
            onClick={() => void copyToken()}
            size="sm"
            type="button"
            variant="secondary"
          >
            <Copy className="h-4 w-4" />
            {copied ? 'Copiado' : 'Copiar token'}
          </Button>
        </Alert>
      ) : null}

      <form
        className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void handleCreate();
        }}
      >
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="printer-name">Nova impressora</Label>
          <Input
            id="printer-name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Caixa"
            value={name}
          />
        </div>
        <Button disabled={createPrinter.isPending} type="submit">
          {createPrinter.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Criar
        </Button>
      </form>

      {devices.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma impressora cadastrada.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {devices.map((device) => {
            const revoked = Boolean(device.revokedAt);
            return (
              <li
                className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                key={device.id}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{device.name}</p>
                    <Badge variant={revoked ? 'muted' : 'default'}>
                      {revoked ? 'Revogada' : 'Ativa'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Último contato: {formatWhen(device.lastSeenAt)}
                  </p>
                </div>
                {revoked ? null : (
                  <Button
                    disabled={revokePrinter.isPending}
                    onClick={() => void handleRevoke(device.id)}
                    type="button"
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Revogar
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
