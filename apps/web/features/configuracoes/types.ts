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
};

export type TeamInvitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
};

export type TeamSnapshot = {
  members: TeamMember[];
  invitations: TeamInvitation[];
};
