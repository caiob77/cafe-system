'use client';

import { Loader2, Mail, UserMinus } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

import { useSessionUI } from '@/features/auth/context/session-ui-provider';

import {
  useCancelInvitation,
  useInviteMember,
  useRemoveMember,
  useTeam,
  useUpdateMemberRole,
} from '../api/use-team';
import { type InviteRole, inviteRoles, labelRole } from '../roles';

function formatWhen(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
}

export function TeamContainer() {
  const session = useSessionUI();
  const teamQuery = useTeam();
  const inviteMember = useInviteMember();
  const cancelInvitation = useCancelInvitation();
  const removeMember = useRemoveMember();
  const updateRole = useUpdateMemberRole();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('attendant');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleInvite() {
    setError(null);
    setNotice(null);
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Informe um e-mail válido.');
      return;
    }

    try {
      await inviteMember.mutateAsync({ email: trimmed, role });
      setEmail('');
      setNotice('Convite registrado. O envio de e-mail ainda só aparece no log da API.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o convite.');
    }
  }

  async function run(action: () => Promise<unknown>, fallback: string) {
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    }
  }

  if (teamQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (teamQuery.isError || !teamQuery.data) {
    return <Alert variant="destructive">Não foi possível carregar a equipe.</Alert>;
  }

  const pending = teamQuery.data.invitations.filter(
    (invitation) => invitation.status === 'pending',
  );

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      {notice ? <Alert>{notice}</Alert> : null}

      <form
        className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-4 shadow-sm md:grid-cols-[1fr_180px_auto] md:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void handleInvite();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="invite-email">Convidar por e-mail</Label>
          <Input
            id="invite-email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-role">Papel</Label>
          <Select
            id="invite-role"
            onChange={(event) => setRole(event.target.value as InviteRole)}
            value={role}
          >
            {inviteRoles.map((option) => (
              <option key={option} value={option}>
                {labelRole(option)}
              </option>
            ))}
          </Select>
        </div>
        <Button disabled={inviteMember.isPending} type="submit">
          {inviteMember.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          Convidar
        </Button>
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Membros</h2>
        <ul className="flex flex-col gap-2">
          {teamQuery.data.members.map((member) => {
            const isSelf = member.userId === session.user.id;
            const isOwner = member.role === 'owner';
            const editableRole = inviteRoles.includes(member.role as InviteRole)
              ? (member.role as InviteRole)
              : null;
            return (
              <li
                className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between"
                key={member.id}
              >
                <div>
                  <p className="text-sm font-medium">{member.user.name}</p>
                  <p className="text-xs text-muted-foreground">{member.user.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isOwner || isSelf || !editableRole ? (
                    <Badge>{labelRole(member.role)}</Badge>
                  ) : (
                    <Select
                      aria-label={`Papel de ${member.user.name}`}
                      className="w-40"
                      disabled={updateRole.isPending}
                      onChange={(event) =>
                        void run(
                          () =>
                            updateRole.mutateAsync({
                              memberId: member.id,
                              role: event.target.value as InviteRole,
                            }),
                          'Não foi possível alterar o papel.',
                        )
                      }
                      value={editableRole}
                    >
                      {inviteRoles.map((option) => (
                        <option key={option} value={option}>
                          {labelRole(option)}
                        </option>
                      ))}
                    </Select>
                  )}
                  {isSelf || isOwner ? null : (
                    <Button
                      disabled={removeMember.isPending}
                      onClick={() =>
                        void run(
                          () => removeMember.mutateAsync(member.id),
                          'Não foi possível remover o membro.',
                        )
                      }
                      type="button"
                      variant="destructive"
                    >
                      <UserMinus className="h-4 w-4" />
                      Remover
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Convites pendentes</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum convite pendente.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pending.map((invitation) => (
              <li
                className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                key={invitation.id}
              >
                <div>
                  <p className="text-sm font-medium">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {labelRole(invitation.role)}
                    {formatWhen(invitation.expiresAt)
                      ? ` · expira em ${formatWhen(invitation.expiresAt)}`
                      : ''}
                  </p>
                </div>
                <Button
                  disabled={cancelInvitation.isPending}
                  onClick={() =>
                    void run(
                      () => cancelInvitation.mutateAsync(invitation.id),
                      'Não foi possível cancelar o convite.',
                    )
                  }
                  type="button"
                  variant="secondary"
                >
                  Cancelar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
