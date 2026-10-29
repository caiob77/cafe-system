export type CafeProfile = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  addressLine: string | null;
  phone: string | null;
  brandColor: string | null;
};

export type UpdateCafeProfilePayload = {
  slug?: string;
  name: string;
  logo: string | null;
  addressLine: string | null;
  phone: string | null;
  brandColor: string | null;
};

export type PrinterDevice = {
  id: string;
  name: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type CreatedPrinterDevice = PrinterDevice & {
  token: string;
};

export type TeamMember = {
  id: string;
  userId: string;
  role: string;
  user: {
    name: string;
    email: string;
  };
  /** Usuário das contas criadas pelo dono (login `usuario@slug`); null para quem entra por e-mail. */
  username: string | null;
};

export type UpdateMemberAccessPayload = {
  username?: string;
  password?: string;
};

export type CreateMemberPayload = {
  name: string;
  username: string;
  password: string;
  role: 'manager' | 'attendant' | 'kitchen';
};
