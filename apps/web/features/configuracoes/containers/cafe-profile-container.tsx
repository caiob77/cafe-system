'use client';

import { Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ApiError } from '@/lib/api-client';

import { useSessionUI } from '@/features/auth/context/session-ui-provider';
import { DEFAULT_BRAND_COLOR, parseBrandHex } from '@/features/public-store/brand-color';
import { ORGANIZATION_SLUG_PATTERN } from '@cafe/shared/member-login';

import { useCafeProfile, useUpdateCafeProfile } from '../api/use-cafe-profile';

export function CafeProfileContainer() {
  const session = useSessionUI();
  const profileQuery = useCafeProfile();
  const updateProfile = useUpdateCafeProfile();
  const isOwner = session.role === 'owner';
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [logo, setLogo] = useState('');
  const [useBrandColor, setUseBrandColor] = useState(false);
  const [brandColor, setBrandColor] = useState(DEFAULT_BRAND_COLOR);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile || ready) return;
    setSlug(profile.slug);
    setName(profile.name);
    setPhone(profile.phone ?? '');
    setAddressLine(profile.addressLine ?? '');
    setLogo(profile.logo ?? '');
    const color = parseBrandHex(profile.brandColor);
    setUseBrandColor(Boolean(color));
    setBrandColor(color ?? DEFAULT_BRAND_COLOR);
    setReady(true);
  }, [profileQuery.data, ready]);

  async function handleSave() {
    setError(null);
    setSaved(null);
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError('Informe o nome do café.');
      return;
    }

    const nextSlug = slug.trim().toLowerCase();
    const slugChanged = isOwner && nextSlug !== profileQuery.data?.slug;
    if (slugChanged) {
      if (
        nextSlug.length < 3 ||
        nextSlug.length > 48 ||
        !ORGANIZATION_SLUG_PATTERN.test(nextSlug)
      ) {
        setError('O endereço deve ter de 3 a 48 caracteres: letras minúsculas, números e hífen.');
        return;
      }
      const confirmed = window.confirm(
        `Mudar o endereço para "${nextSlug}"?\n\n` +
          `• O link antigo da loja (/loja/${profileQuery.data?.slug}) para de funcionar.\n` +
          `• A equipe passa a entrar com usuario@${nextSlug} (mesma senha); o @${profileQuery.data?.slug} para de funcionar.`,
      );
      if (!confirmed) return;
    }

    const trimmedLogo = logo.trim();
    if (trimmedLogo.length > 0) {
      try {
        const url = new URL(trimmedLogo);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          setError('A logo precisa ser um endereço http ou https.');
          return;
        }
      } catch {
        setError('A logo precisa ser uma URL válida.');
        return;
      }
    }

    const nextColor = useBrandColor ? parseBrandHex(brandColor) : null;
    if (useBrandColor && !nextColor) {
      setError('A cor da marca precisa estar no formato #RRGGBB.');
      return;
    }

    try {
      const updated = await updateProfile.mutateAsync({
        ...(slugChanged ? { slug: nextSlug } : {}),
        name: trimmedName,
        phone: phone.trim() || null,
        addressLine: addressLine.trim() || null,
        logo: trimmedLogo || null,
        brandColor: nextColor,
      });
      setSlug(updated.slug);
      setSaved(
        slugChanged
          ? `Endereço alterado. Loja: /loja/${updated.slug}. Avise a equipe: o login agora é usuario@${updated.slug}.`
          : 'Dados do café salvos.',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar os dados do café.');
    }
  }

  if (profileQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return <Alert variant="destructive">Não foi possível carregar os dados do café.</Alert>;
  }

  return (
    <form
      className="flex max-w-xl flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSave();
      }}
    >
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      {saved ? <Alert>{saved}</Alert> : null}

      <div className="space-y-1.5">
        <Label htmlFor="cafe-name">Nome</Label>
        <Input id="cafe-name" onChange={(event) => setName(event.target.value)} value={name} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cafe-slug">Endereço (slug)</Label>
        <Input
          autoCapitalize="none"
          disabled={!isOwner}
          id="cafe-slug"
          maxLength={48}
          onChange={(event) => setSlug(event.target.value)}
          spellCheck={false}
          value={slug}
        />
        <p className="text-xs text-muted-foreground">
          {isOwner
            ? 'Usado no link da loja (/loja/endereco) e no login da equipe (usuario@endereco). Mudar quebra os links e logins antigos.'
            : 'Só o proprietário altera o endereço.'}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cafe-phone">Telefone</Label>
        <Input id="cafe-phone" onChange={(event) => setPhone(event.target.value)} value={phone} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cafe-address">Endereço</Label>
        <Input
          id="cafe-address"
          onChange={(event) => setAddressLine(event.target.value)}
          value={addressLine}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cafe-logo">Logo (URL)</Label>
        <Input
          id="cafe-logo"
          onChange={(event) => setLogo(event.target.value)}
          placeholder="https://"
          value={logo}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-md border bg-background p-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="cafe-brand-toggle">Cor da marca</Label>
            <p className="text-xs text-muted-foreground">
              Troca o botão de pedir na loja pública. Sem cor, a loja usa a paleta compartilhada.
            </p>
          </div>
          <Switch
            checked={useBrandColor}
            id="cafe-brand-toggle"
            onCheckedChange={setUseBrandColor}
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            aria-label="Selecionar cor da marca"
            className="h-10 w-14 cursor-pointer rounded-md border border-input bg-card p-1 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!useBrandColor}
            onChange={(event) => setBrandColor(event.target.value.toUpperCase())}
            type="color"
            value={parseBrandHex(brandColor) ?? DEFAULT_BRAND_COLOR}
          />
          <Input
            aria-label="Cor da marca em hexadecimal"
            className="max-w-36 font-mono"
            disabled={!useBrandColor}
            onChange={(event) => setBrandColor(event.target.value)}
            value={brandColor}
          />
        </div>
      </div>

      <div>
        <Button disabled={updateProfile.isPending} type="submit">
          {updateProfile.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar
        </Button>
      </div>
    </form>
  );
}
