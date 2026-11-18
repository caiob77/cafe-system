'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type BaseOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export type ConfirmOptions = BaseOptions;

export type PromptOptions = BaseOptions & {
  label: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
};

type Request =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void };

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
};

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

/**
 * Substitui window.confirm/prompt por diálogos do app (bottom sheet no celular),
 * mantendo a mesma ergonomia baseada em Promise.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = React.useState<Request | null>(null);
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState('');

  const confirm = React.useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setRequest({ kind: 'confirm', options, resolve });
        setOpen(true);
      }),
    [],
  );

  const prompt = React.useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setText('');
        setRequest({ kind: 'prompt', options, resolve });
        setOpen(true);
      }),
    [],
  );

  const value = React.useMemo(() => ({ confirm, prompt }), [confirm, prompt]);

  function settle(accepted: boolean) {
    if (!request) return;
    if (request.kind === 'confirm') request.resolve(accepted);
    else request.resolve(accepted ? text.trim() : null);
    setOpen(false);
  }

  const options = request?.options;
  const minLength = request?.kind === 'prompt' ? (request.options.minLength ?? 1) : 0;
  const invalid = request?.kind === 'prompt' && text.trim().length < minLength;

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog
        onOpenChange={(next) => {
          if (!next) settle(false);
        }}
        open={open}
      >
        <DialogContent className="sm:max-w-md">
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!invalid) settle(true);
            }}
          >
            <DialogHeader>
              <DialogTitle>{options?.title}</DialogTitle>
              {options?.description ? (
                <DialogDescription>{options.description}</DialogDescription>
              ) : null}
            </DialogHeader>

            {request?.kind === 'prompt' ? (
              <div className="space-y-2">
                <Label htmlFor="confirm-dialog-input">{request.options.label}</Label>
                <Textarea
                  autoFocus
                  id="confirm-dialog-input"
                  maxLength={request.options.maxLength ?? 500}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={request.options.placeholder}
                  rows={3}
                  value={text}
                />
              </div>
            ) : null}

            <DialogFooter>
              <Button onClick={() => settle(false)} type="button" variant="ghost">
                {options?.cancelLabel ?? 'Voltar'}
              </Button>
              <Button
                disabled={invalid}
                type="submit"
                variant={options?.destructive ? 'destructive' : 'default'}
              >
                {options?.confirmLabel ?? 'Confirmar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm precisa estar dentro de <ConfirmProvider>');
  return ctx;
}
