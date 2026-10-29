import { hashPassword, prisma, verifyPassword } from '@cafe/db';
import { isMemberEmail, memberEmail, parseMemberEmail } from '@cafe/shared';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { createAccessControl, organization } from 'better-auth/plugins';

import { env } from './env.js';

const DISABLED_INVITATION_PATHS = new Set([
  '/organization/invite-member',
  '/organization/accept-invitation',
]);

const statements = {
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  team: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
} as const;

export const ac = createAccessControl(statements);

export const owner = ac.newRole({
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  team: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
});

export const manager = ac.newRole({
  organization: ['update'],
  member: ['create', 'update'],
  invitation: ['create', 'cancel'],
  team: ['create', 'update', 'delete'],
  ac: ['read'],
});

export const attendant = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: [],
});

export const kitchen = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: [],
});

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.WEB_URL],
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (DISABLED_INVITATION_PATHS.has(ctx.path)) {
        throw new APIError('GONE', {
          message: 'Convites por e-mail foram desativados. O proprietário cadastra a equipe.',
        });
      }
      // Troca de slug só pelo PATCH /organization/profile, que valida o formato e exige dono.
      const data = (ctx.body as { data?: { slug?: unknown } } | undefined)?.data;
      if (ctx.path === '/organization/update' && data?.slug !== undefined) {
        throw new APIError('BAD_REQUEST', {
          message: 'Altere o endereço do café pela tela de perfil.',
        });
      }

      if (ctx.path === '/sign-in/email') {
        const body = ctx.body as { email?: unknown } | undefined;
        const login = typeof body?.email === 'string' ? parseMemberEmail(body.email) : null;
        if (login) {
          const org = await prisma.organization.findUnique({
            where: { slug: login.scope },
            select: { id: true },
          });
          if (!org) {
            throw new APIError('UNAUTHORIZED', { message: 'Usuário ou senha inválidos' });
          }
          return { context: { body: { ...body, email: memberEmail(login.username, org.id) } } };
        }
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        // Membros com login `usuario@slug` são criados direto no banco pela API do café.
        before: async (user) => {
          if (isMemberEmail(user.email)) {
            throw new APIError('BAD_REQUEST', { message: 'E-mail inválido' });
          }
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    password: {
      hash: async (password) => hashPassword(password),
      verify: async ({ hash, password }) => verifyPassword(password, hash),
    },
  },
  plugins: [
    organization({
      ac,
      creatorRole: 'owner',
      roles: {
        owner,
        manager,
        attendant,
        kitchen,
      },
    }),
  ],
});

export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
export type AppRole = 'owner' | 'manager' | 'attendant' | 'kitchen';
