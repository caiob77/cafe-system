'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionUI } from '@/features/auth/context/session-ui-provider';
import { authClient } from '@/lib/auth-client';

import type { InviteRole } from '../roles';
import type { TeamInvitation, TeamMember, TeamSnapshot } from '../types';

export const teamKeys = {
  all: ['team'] as const,
  detail: () => [...teamKeys.all, 'detail'] as const,
};

type AuthResult = {
  data: unknown;
  error: { message?: string } | null;
};

type OrganizationActions = {
  getFullOrganization: (input: {
    query: { organizationId: string };
  }) => Promise<AuthResult>;
  inviteMember: (body: {
    email: string;
    role: InviteRole;
    organizationId: string;
  }) => Promise<AuthResult>;
  cancelInvitation: (body: { invitationId: string }) => Promise<AuthResult>;
  removeMember: (body: { memberIdOrEmail: string; organizationId: string }) => Promise<AuthResult>;
  updateMemberRole: (body: {
    memberId: string;
    role: InviteRole;
    organizationId: string;
  }) => Promise<AuthResult>;
};

function organizationActions() {
  return authClient.organization as unknown as OrganizationActions;
}

function authError(error: AuthResult['error'], fallback: string) {
  return new Error(error?.message || fallback);
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function parseMember(value: unknown): TeamMember | null {
  if (!value || typeof value !== 'object') return null;
  const member = value as Record<string, unknown>;
  const user = member.user;
  if (!user || typeof user !== 'object') return null;
  const profile = user as Record<string, unknown>;
  const id = text(member.id);
  const userId = text(member.userId);
  if (!id || !userId) return null;
  return {
    id,
    userId,
    role: text(member.role) || 'attendant',
    user: {
      name: text(profile.name) || 'Sem nome',
      email: text(profile.email),
    },
  };
}

function parseInvitation(value: unknown): TeamInvitation | null {
  if (!value || typeof value !== 'object') return null;
  const invitation = value as Record<string, unknown>;
  const id = text(invitation.id);
  const email = text(invitation.email);
  if (!id || !email) return null;
  const expiresAt = invitation.expiresAt;
  return {
    id,
    email,
    role: text(invitation.role) || 'attendant',
    status: text(invitation.status) || 'pending',
    expiresAt: expiresAt instanceof Date ? expiresAt.toISOString() : text(expiresAt),
  };
}

function parseTeam(value: unknown): TeamSnapshot {
  if (!value || typeof value !== 'object') return { members: [], invitations: [] };
  const organization = value as Record<string, unknown>;
  const members = Array.isArray(organization.members)
    ? organization.members.flatMap((member) => {
        const parsed = parseMember(member);
        return parsed ? [parsed] : [];
      })
    : [];
  const invitations = Array.isArray(organization.invitations)
    ? organization.invitations.flatMap((invitation) => {
        const parsed = parseInvitation(invitation);
        return parsed ? [parsed] : [];
      })
    : [];
  return { members, invitations };
}

async function loadTeam(organizationId: string) {
  const { data, error } = await organizationActions().getFullOrganization({
    query: { organizationId },
  });
  if (error) throw authError(error, 'Não foi possível carregar a equipe.');
  return parseTeam(data);
}

export function useTeam() {
  const { tenantId } = useSessionUI();

  return useQuery({
    queryKey: [...teamKeys.detail(), tenantId],
    queryFn: () => {
      if (!tenantId) throw new Error('Nenhum café ativo.');
      return loadTeam(tenantId);
    },
    enabled: Boolean(tenantId),
    staleTime: 15_000,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  const { tenantId } = useSessionUI();

  return useMutation({
    mutationFn: async (input: { email: string; role: InviteRole }) => {
      if (!tenantId) throw new Error('Nenhum café ativo.');
      const { error } = await organizationActions().inviteMember({
        ...input,
        organizationId: tenantId,
      });
      if (error) throw authError(error, 'Não foi possível enviar o convite.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await organizationActions().cancelInvitation({ invitationId });
      if (error) throw authError(error, 'Não foi possível cancelar o convite.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  const { tenantId } = useSessionUI();

  return useMutation({
    mutationFn: async (memberIdOrEmail: string) => {
      if (!tenantId) throw new Error('Nenhum café ativo.');
      const { error } = await organizationActions().removeMember({
        memberIdOrEmail,
        organizationId: tenantId,
      });
      if (error) throw authError(error, 'Não foi possível remover o membro.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const { tenantId } = useSessionUI();

  return useMutation({
    mutationFn: async (input: { memberId: string; role: InviteRole }) => {
      if (!tenantId) throw new Error('Nenhum café ativo.');
      const { error } = await organizationActions().updateMemberRole({
        ...input,
        organizationId: tenantId,
      });
      if (error) throw authError(error, 'Não foi possível alterar o papel.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}
