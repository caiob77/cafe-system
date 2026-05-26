'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { Category, CategoryInput } from '@/features/cardapio/types';

type CategoryFormDialogProps = {
  open: boolean;
  category: Category | null;
  loading: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CategoryInput) => Promise<void> | void;
};

export function CategoryFormDialog({
  open,
  category,
  loading,
  error,
  onOpenChange,
  onSubmit,
}: CategoryFormDialogProps) {
  const [name, setName] = useState('');
  const isEditing = category !== null;

  useEffect(() => {
    if (open) setName(category?.name ?? '');
  }, [open, category]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    await onSubmit({ name: name.trim() });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize o nome dessa categoria do cardápio.'
              : 'Crie uma seção do cardápio (ex.: Tapioca, Cuscuz, Pães).'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="category-name">Nome</Label>
            <Input
              autoFocus
              id="category-name"
              maxLength={80}
              minLength={2}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tapioca"
              required
              value={name}
            />
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} type="button" variant="ghost">
              Cancelar
            </Button>
            <Button disabled={loading || name.trim().length < 2} type="submit">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEditing ? 'Salvar alterações' : 'Criar categoria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
