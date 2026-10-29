import { z } from 'zod';

import { MEMBER_USERNAME_PATTERN } from '../member-login.js';

export * from '../member-login.js';

export const memberRoles = ['manager', 'attendant', 'kitchen'] as const;
export type MemberRole = (typeof memberRoles)[number];

export const memberUsernameSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(
    z
      .string()
      .min(3, 'Usuário deve ter ao menos 3 caracteres')
      .max(32, 'Usuário deve ter no máximo 32 caracteres')
      .regex(
        MEMBER_USERNAME_PATTERN,
        'Use letras, números, ponto, hífen ou sublinhado (sem espaços)',
      ),
  );

const memberPasswordSchema = z
  .string()
  .min(8, 'Senha deve ter ao menos 8 caracteres')
  .max(128, 'Senha muito longa');

export const createMemberSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome').max(120, 'Nome muito longo'),
  username: memberUsernameSchema,
  password: memberPasswordSchema,
  role: z.enum(memberRoles),
});

/** O usuário é sempre regravado com o slug atual do café, o que corrige logins antigos. */
export const updateMemberAccessSchema = z
  .object({
    username: memberUsernameSchema.optional(),
    password: memberPasswordSchema.optional(),
  })
  .refine((value) => value.username !== undefined || value.password !== undefined, {
    message: 'Informe o novo usuário ou a nova senha',
  });

export const memberIdParamSchema = z.object({
  memberId: z.string().min(1),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberAccessInput = z.infer<typeof updateMemberAccessSchema>;
