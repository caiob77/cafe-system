import { redirect } from 'next/navigation';

import { LogoutButton } from '@/components/layout/logout-button';
import { MobileNav, Sidebar } from '@/components/layout/sidebar';
import { SessionUIProvider } from '@/features/auth/context/session-ui-provider';
import { getCurrentOrganization, getCurrentUser } from '@/lib/server-api';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();

  if (!session) redirect('/login');

  if (session.data.tenantId) {
    const org = await getCurrentOrganization();
    if (org && !org.data.setupCompleted && session.data.role === 'owner') {
      redirect('/setup');
    }
  }

  return (
    <SessionUIProvider session={session.data}>
      <div className="flex min-h-screen bg-background">
        <Sidebar role={session.data.role} />
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
            <div>
              <p className="text-sm font-medium">{session.data.user.name}</p>
              <p className="text-xs text-muted-foreground">
                {session.data.role ?? 'sem função'} · {session.data.tenantId ?? 'sem café'}
              </p>
            </div>
            <LogoutButton />
          </header>
          <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
          <MobileNav role={session.data.role} />
        </div>
      </div>
    </SessionUIProvider>
  );
}
