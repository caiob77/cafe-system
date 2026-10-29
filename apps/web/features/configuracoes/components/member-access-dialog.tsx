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
import { MEMBER_USERNAME_PATTERN } from '@cafe/shared/member-login';

import type { TeamMember, UpdateMemberAccessPayload } from '../types';

type MemberAccessDialogProps = {
  member: TeamMember | null;
  slug: string | null;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: UpdateMemberAccessPayload) => Promise<void>;
};

export function MemberAccessDialog({
  member,
  slug,
  loading,
  onOpenChange,
  onSubmit,
}: MemberAccessDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const currentUsername = member?.username ?? null;
  const normalizedUsername = username.trim().toLowerCase();

  useEffect(() => {
    if (member) {
      setUsername(member.username ?? '');
      setPassword('');
      setError(null);
    }
  }, [member]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !currentUsername) return;
    setError(null);

    const usernameChanged = normalizedUsername !== currentUsername;
    if (usernameChanged) {
      if (normalizedUsername.length < 3 || normalizedUsername.length > 32) {
        setError('O usuário deve ter entre 3 e 32 caracteres.');
        return;
      }
      if (!MEMBER_USERNAME_PATTERN.test(normalizedUsername)) {
        setError(
          'No usuário, use letras minúsculas, números, ponto, hífen ou sublinhado, sem espaços.',
        );
        return;
      }
    }
    if (password.length > 0 && password.length < 8) {
      setError('A senha deve ter ao menos 8 caracteres.');
      return;
    }
    if (!usernameChanged && password.length === 0) {
      setError('Altere o usuário ou informe uma nova senha.');
      return;
    }

    try {
      await onSubmit({
        ...(usernameChanged ? { username: normalizedUsername } : {}),
        ...(password ? { password } : {}),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o acesso.');
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={member !== null}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar acesso</DialogTitle>
          <DialogDescription>
            {member?.user.name}. Deixe a senha em branco para manter a atual.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="access-username">Usuário</Label>
            <Input
              autoCapitalize="none"
              autoComplete="off"
              id="access-username"
              maxLength={32}
              onChange={(event) => setUsername(event.target.value)}
              spellCheck={false}
              value={username}
            />
            <p className="text-xs text-muted-foreground">
              Login: {normalizedUsername || 'usuario'}@{slug ?? 'seu-cafe'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="access-password">Nova senha</Label>
            <Input
              autoComplete="new-password"
              id="access-password"
              maxLength={128}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Manter a atual"
              type="password"
              value={password}
            />
            <p className="text-xs text-muted-foreground">
              Mínimo de 8 caracteres. Trocar a senha desconecta o membro dos aparelhos.
            </p>
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
            <Button disabled={loading} type="submit">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
