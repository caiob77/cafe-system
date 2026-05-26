'use client';

import { Loader2, Plus, Trash2 } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import {
  useCreateProductAddon,
  useDeleteProductAddon,
  useUpdateProductAddon,
} from '@/features/cardapio/api/use-addons';
import type { Category, Product, ProductAddon, ProductInput } from '@/features/cardapio/types';
import { priceInputToApi } from '@/features/cardapio/utils/format-price';

type ProductFormDialogProps = {
  open: boolean;
  product: Product | null;
  defaultCategoryId: string | null;
  categories: Category[];
  addons: ProductAddon[];
  loading: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: ProductInput) => Promise<Product | undefined>;
};

type AddonDraft = {
  key: string;
  id: string | null;
  name: string;
  price: string;
  available: boolean;
};

function toDraft(addon: ProductAddon): AddonDraft {
  return {
    key: addon.id,
    id: addon.id,
    name: addon.name,
    price: addon.price,
    available: addon.available,
  };
}

function newDraft(): AddonDraft {
  return {
    key: `new-${Math.random().toString(36).slice(2, 10)}`,
    id: null,
    name: '',
    price: '',
    available: true,
  };
}

export function ProductFormDialog({
  open,
  product,
  defaultCategoryId,
  categories,
  addons,
  loading,
  error,
  onOpenChange,
  onSubmit,
}: ProductFormDialogProps) {
  const isEditing = product !== null;

  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [available, setAvailable] = useState(true);
  const [addonDrafts, setAddonDrafts] = useState<AddonDraft[]>([]);
  const [addonError, setAddonError] = useState<string | null>(null);

  const productId = product?.id ?? '';
  const createAddon = useCreateProductAddon(productId);
  const updateAddon = useUpdateProductAddon(productId);
  const deleteAddon = useDeleteProductAddon(productId);
  const addonMutating = createAddon.isPending || updateAddon.isPending || deleteAddon.isPending;

  useEffect(() => {
    if (!open) return;
    setCategoryId(product?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? '');
    setName(product?.name ?? '');
    setDescription(product?.description ?? '');
    setPrice(product?.price ?? '');
    setImageUrl(product?.imageUrl ?? '');
    setAvailable(product?.available ?? true);
    setAddonDrafts(product ? addons.map(toDraft) : []);
    setAddonError(null);
  }, [open, product, defaultCategoryId, categories, addons]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    await onSubmit({
      categoryId,
      name: name.trim(),
      description: description.trim() === '' ? null : description.trim(),
      price: priceInputToApi(price),
      imageUrl: imageUrl.trim() === '' ? null : imageUrl.trim(),
      available,
    });
  }

  function updateDraft(index: number, patch: Partial<AddonDraft>) {
    setAddonDrafts((drafts) =>
      drafts.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)),
    );
  }

  async function persistAddon(draft: AddonDraft, index: number) {
    if (!isEditing || !productId) {
      setAddonError('Salve o produto antes de adicionar adicionais.');
      return;
    }
    if (!draft.name.trim() || !draft.price) {
      setAddonError('Preencha nome e preço do adicional.');
      return;
    }
    setAddonError(null);
    const payload = {
      name: draft.name.trim(),
      price: priceInputToApi(draft.price),
      available: draft.available,
    };
    try {
      if (draft.id) {
        const updated = await updateAddon.mutateAsync({ id: draft.id, ...payload });
        updateDraft(index, toDraft(updated));
      } else {
        const created = await createAddon.mutateAsync(payload);
        updateDraft(index, toDraft(created));
      }
    } catch (err) {
      setAddonError(err instanceof Error ? err.message : 'Erro ao salvar adicional.');
    }
  }

  async function removeAddon(draft: AddonDraft, index: number) {
    if (!draft.id) {
      setAddonDrafts((drafts) => drafts.filter((_, i) => i !== index));
      return;
    }
    if (!productId) return;
    setAddonError(null);
    try {
      await deleteAddon.mutateAsync(draft.id);
      setAddonDrafts((drafts) => drafts.filter((_, i) => i !== index));
    } catch (err) {
      setAddonError(err instanceof Error ? err.message : 'Erro ao remover adicional.');
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          <DialogDescription>
            Cadastre nome, preço, foto e disponibilidade. Adicionais ficam disponíveis após salvar o
            produto.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" id="product-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="product-name">Nome</Label>
              <Input
                autoFocus
                id="product-name"
                maxLength={120}
                minLength={2}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Tapioca c/ queijo e ovo"
                required
                value={name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-category">Categoria</Label>
              <select
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                )}
                id="product-category"
                onChange={(e) => setCategoryId(e.target.value)}
                required
                value={categoryId}
              >
                <option disabled value="">
                  Selecione…
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-price">Preço (R$)</Label>
              <Input
                id="product-price"
                inputMode="decimal"
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0,00"
                required
                value={price}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="product-description">Descrição</Label>
              <Textarea
                id="product-description"
                maxLength={500}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes que aparecem no card do produto"
                rows={3}
                value={description}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="product-image">URL da imagem</Label>
              <Input
                id="product-image"
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
                type="url"
                value={imageUrl}
              />
              <p className="text-xs text-muted-foreground">
                Cole uma URL pública por enquanto. Upload via Cloudinary entra numa fase futura.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3 sm:col-span-2">
              <div>
                <Label className="text-sm font-medium" htmlFor="product-available">
                  Disponível para venda
                </Label>
                <p className="text-xs text-muted-foreground">Desligue para marcar como esgotado.</p>
              </div>
              <Switch checked={available} id="product-available" onCheckedChange={setAvailable} />
            </div>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </form>

        <section className="space-y-3 border-t pt-4">
          <header className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Adicionais</h3>
              <p className="text-xs text-muted-foreground">
                Ex.: + Queijo, + Ovo, + Tucumã. Salvos individualmente.
              </p>
            </div>
            <Button
              disabled={!isEditing}
              onClick={() => setAddonDrafts((drafts) => [...drafts, newDraft()])}
              size="sm"
              type="button"
              variant="secondary"
            >
              <Plus className="h-4 w-4" />
              Adicional
            </Button>
          </header>

          {!isEditing ? (
            <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Salve o produto primeiro para cadastrar adicionais.
            </p>
          ) : addonDrafts.length === 0 ? (
            <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Sem adicionais ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {addonDrafts.map((draft, index) => {
                const dirty =
                  !draft.id ||
                  draft.name !== (addons.find((a) => a.id === draft.id)?.name ?? '') ||
                  draft.price !== (addons.find((a) => a.id === draft.id)?.price ?? '') ||
                  draft.available !== (addons.find((a) => a.id === draft.id)?.available ?? true);

                return (
                  <li
                    className="grid grid-cols-12 items-center gap-2 rounded-md border bg-muted/20 p-2"
                    key={draft.key}
                  >
                    <Input
                      aria-label="Nome do adicional"
                      className="col-span-5"
                      maxLength={80}
                      onChange={(e) => updateDraft(index, { name: e.target.value })}
                      placeholder="+ Queijo"
                      value={draft.name}
                    />
                    <Input
                      aria-label="Preço do adicional"
                      className="col-span-3"
                      inputMode="decimal"
                      onChange={(e) => updateDraft(index, { price: e.target.value })}
                      placeholder="0,00"
                      value={draft.price}
                    />
                    <div className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch
                        aria-label="Disponível"
                        checked={draft.available}
                        onCheckedChange={(v) => updateDraft(index, { available: v })}
                      />
                      <span>OK</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <Button
                        disabled={!dirty || addonMutating}
                        onClick={() => persistAddon(draft, index)}
                        size="sm"
                        type="button"
                        variant="default"
                      >
                        Salvar
                      </Button>
                      <Button
                        aria-label="Remover adicional"
                        disabled={addonMutating}
                        onClick={() => removeAddon(draft, index)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {addonError ? (
            <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {addonError}
            </p>
          ) : null}
        </section>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="ghost">
            Cancelar
          </Button>
          <Button
            disabled={loading || name.trim().length < 2 || price.trim() === '' || categoryId === ''}
            form="product-form"
            type="submit"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEditing ? 'Salvar alterações' : 'Criar produto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
