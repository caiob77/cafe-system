'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionUI } from '@/features/auth/context/session-ui-provider';
import { apiClient } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';
import { parseMemberEmail } from '@cafe/shared/member-login';

import type { MemberRole } from '../roles';
import type { CreateMemberPayload, TeamMember, UpdateMemberAccessPayload } from '../types';

type MemberAccessResult = { id: string; login: string };
type CreatedMember = { id: string; user: { name: string }; login: string };

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
  updateMemberRole: (body: {
    memberId: string;
    role: MemberRole;
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
  const email = text(profile.email);
  return {
    id,
    userId,
    role: text(member.role) || 'attendant',
    user: {
      name: text(profile.name) || 'Sem nome',
      email,
    },
    username: parseMemberEmail(email)?.username ?? null,
  };
}

function parseMembers(value: unknown): TeamMember[] {
  if (!value || typeof value !== 'object') return [];
  const organization = value as Record<string, unknown>;
  if (!Array.isArray(organization.members)) return [];
  return organization.members.flatMap((member) => {
    const parsed = parseMember(member);
    return parsed ? [parsed] : [];
  });
}

async function loadTeam(organizationId: string) {
  const { data, error } = await organizationActions().getFullOrganization({
    query: { organizationId },
  });
  if (error) throw authError(error, 'Não foi possível carregar a equipe.');
  return parseMembers(data);
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

export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMemberPayload) =>
      apiClient<{ data: CreatedMember }>('/api/v1/organization/members', {
        method: 'POST',
        body: JSON.stringify(input),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useUpdateMemberAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, ...input }: UpdateMemberAccessPayload & { memberId: string }) =>
      apiClient<{ data: MemberAccessResult }>(`/api/v1/organization/members/${memberId}/access`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) =>
      apiClient(`/api/v1/organization/members/${memberId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const { tenantId } = useSessionUI();

  return useMutation({
    mutationFn: async (input: { memberId: string; role: MemberRole }) => {
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
