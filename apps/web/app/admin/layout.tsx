import { redirect } from 'next/navigation';

import { LogoutButton } from '@/components/layout/logout-button';
import { getCurrentUser } from '@/lib/server-api';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();
  if (!session) redirect('/login');
  if (!session.data.isSuperAdmin) redirect('/pedidos');

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
            SUPER ADMIN
          </div>
          <div>
            <p className="text-sm font-medium">{session.data.user.name}</p>
            <p className="text-xs text-muted-foreground">{session.data.user.email}</p>
          </div>
        </div>
        <LogoutButton />
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">{children}</main>
    </div>
  );
}
