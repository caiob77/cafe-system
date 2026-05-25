import { hashPassword, prisma, verifyPassword } from '@cafe/db';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createAccessControl, organization } from 'better-auth/plugins';

import { env } from './env.js';

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
      sendInvitationEmail: async ({ email, id, organization }) => {
        // Passo 1.4 não envia email ainda; logamos o link para teste local.
        console.info(
          `Convite para ${email} entrar em ${organization.name}: ${env.WEB_URL}/accept-invitation?id=${id}`,
        );
      },
    }),
  ],
});

export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
export type AppRole = 'owner' | 'manager' | 'attendant' | 'kitchen';
