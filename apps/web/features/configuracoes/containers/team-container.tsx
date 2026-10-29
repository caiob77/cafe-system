'use client';

import { KeyRound, Loader2, UserMinus, UserPlus } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

import { useSessionUI } from '@/features/auth/context/session-ui-provider';
import { MEMBER_USERNAME_PATTERN } from '@cafe/shared/member-login';

import { useCafeProfile } from '../api/use-cafe-profile';
import {
  useCreateMember,
  useRemoveMember,
  useTeam,
  useUpdateMemberAccess,
  useUpdateMemberRole,
} from '../api/use-team';
import { MemberAccessDialog } from '../components/member-access-dialog';
import { type MemberRole, labelRole, memberRoles } from '../roles';
import type { TeamMember } from '../types';

function validateMember(name: string, username: string, password: string): string | null {
  if (name.length < 2) return 'Informe o nome do membro.';
  if (username.length < 3 || username.length > 32) {
    return 'O usuário deve ter entre 3 e 32 caracteres.';
  }
  if (!MEMBER_USERNAME_PATTERN.test(username)) {
    return 'No usuário, use letras minúsculas, números, ponto, hífen ou sublinhado, sem espaços.';
  }
  if (password.length < 8) return 'A senha deve ter ao menos 8 caracteres.';
  return null;
}

export function TeamContainer() {
  const session = useSessionUI();
  const teamQuery = useTeam();
  const cafeQuery = useCafeProfile();
  const createMember = useCreateMember();
  const removeMember = useRemoveMember();
  const updateRole = useUpdateMemberRole();
  const updateAccess = useUpdateMemberAccess();
  const [editingAccess, setEditingAccess] = useState<TeamMember | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<MemberRole>('attendant');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isOwner = session.role === 'owner';
  const canEditRoles = session.role === 'owner' || session.role === 'manager';
  const slug = cafeQuery.data?.slug ?? null;
  const normalizedUsername = username.trim().toLowerCase();
  async function handleCreate() {
    setError(null);
    setNotice(null);
    const trimmedName = name.trim();
    const invalid = validateMember(trimmedName, normalizedUsername, password);
    if (invalid) {
      setError(invalid);
      return;
    }

    try {
      const created = await createMember.mutateAsync({
        name: trimmedName,
        username: normalizedUsername,
        password,
        role,
      });
      setName('');
      setUsername('');
      setPassword('');
      setNotice(
        `${created.user.name} cadastrado. Login: ${created.login}. Passe a senha para ele.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cadastrar o membro.');
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

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      {notice ? <Alert>{notice}</Alert> : null}

      {isOwner ? (
        <form
          className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate();
          }}
        >
          <h2 className="text-sm font-semibold">Cadastrar membro</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="member-name">Nome</Label>
              <Input
                autoComplete="off"
                id="member-name"
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-role">Papel</Label>
              <Select
                id="member-role"
                onChange={(event) => setRole(event.target.value as MemberRole)}
                value={role}
              >
                {memberRoles.map((option) => (
                  <option key={option} value={option}>
                    {labelRole(option)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-username">Usuário</Label>
              <Input
                autoCapitalize="none"
                autoComplete="off"
                id="member-username"
                maxLength={32}
                onChange={(event) => setUsername(event.target.value)}
                spellCheck={false}
                value={username}
              />
              <p className="text-xs text-muted-foreground">
                Login: {normalizedUsername || 'usuario'}@{slug ?? 'seu-cafe'}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-password">Senha</Label>
              <Input
                autoComplete="new-password"
                id="member-password"
                maxLength={128}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
              <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button disabled={createMember.isPending} type="submit">
              {createMember.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Cadastrar
            </Button>
          </div>
        </form>
      ) : (
        <Alert>Só o proprietário cadastra e remove membros.</Alert>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Membros</h2>
        <ul className="flex flex-col gap-2">
          {teamQuery.data.map((member) => {
            const isSelf = member.userId === session.user.id;
            const memberIsOwner = member.role === 'owner';
            const editableRole = memberRoles.includes(member.role as MemberRole)
              ? (member.role as MemberRole)
              : null;
            return (
              <li
                className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between"
                key={member.id}
              >
                <div>
                  <p className="text-sm font-medium">{member.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.username
                      ? `Login: ${member.username}@${slug ?? 'seu-cafe'}`
                      : member.user.email}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {memberIsOwner || isSelf || !editableRole || !canEditRoles ? (
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
                              role: event.target.value as MemberRole,
                            }),
                          'Não foi possível alterar o papel.',
                        )
                      }
                      value={editableRole}
                    >
                      {memberRoles.map((option) => (
                        <option key={option} value={option}>
                          {labelRole(option)}
                        </option>
                      ))}
                    </Select>
                  )}
                  {!isOwner || isSelf || memberIsOwner || !member.username ? null : (
                    <Button
                      onClick={() => {
                        setError(null);
                        setNotice(null);
                        setEditingAccess(member);
                      }}
                      type="button"
                      variant="secondary"
                    >
                      <KeyRound className="h-4 w-4" />
                      Editar acesso
                    </Button>
                  )}
                  {!isOwner || isSelf || memberIsOwner ? null : (
                    <Button
                      disabled={removeMember.isPending}
                      onClick={() => {
                        const message = member.username
                          ? `Remover ${member.user.name} da equipe? A conta e o login dele serão apagados.`
                          : `Remover ${member.user.name} da equipe?`;
                        if (!window.confirm(message)) return;
                        void run(
                          () => removeMember.mutateAsync(member.id),
                          'Não foi possível remover o membro.',
                        );
                      }}
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

      <MemberAccessDialog
        loading={updateAccess.isPending}
        member={editingAccess}
        onOpenChange={(open) => {
          if (!open) setEditingAccess(null);
        }}
        onSubmit={async (input) => {
          if (!editingAccess) return;
          const updated = await updateAccess.mutateAsync({ memberId: editingAccess.id, ...input });
          setEditingAccess(null);
          setNotice(
            input.password
              ? `Acesso de ${editingAccess.user.name} atualizado. Login: ${updated.login}. Passe a nova senha para ele.`
              : `Login de ${editingAccess.user.name} atualizado para ${updated.login}.`,
          );
        }}
        slug={slug}
      />
    </div>
  );
}
