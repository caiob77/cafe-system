import { redirect } from 'next/navigation';

import { getCurrentOrganization, getCurrentUser } from '@/lib/server-api';

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();
  if (!session) redirect('/login');

  if (session.data.role !== 'owner') redirect('/pedidos');

  const org = await getCurrentOrganization();
  if (!org) redirect('/login');

  if (org.data.setupCompleted) redirect('/pedidos');

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">{children}</div>
    </div>
  );
}
