import type { PrismaClient } from '@cafe/db';

export async function syncSuperAdmins(prisma: PrismaClient, emails: string[]): Promise<void> {
  const normalized = emails.map((email) => email.toLowerCase()).filter((email) => email.length > 0);
  if (normalized.length === 0) {
    await prisma.user.updateMany({
      where: { isSuperAdmin: true },
      data: { isSuperAdmin: false },
    });
    return;
  }

  await prisma.$transaction([
    prisma.user.updateMany({
      where: {
        isSuperAdmin: true,
        email: { notIn: normalized },
      },
      data: { isSuperAdmin: false },
    }),
    prisma.user.updateMany({
      where: { email: { in: normalized } },
      data: { isSuperAdmin: true },
    }),
  ]);
}
