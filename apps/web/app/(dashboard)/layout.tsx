import { PackageCheck } from 'lucide-react';
import { redirect } from 'next/navigation';

import { LogoutButton } from '@/components/layout/logout-button';
import { MobileNav, Sidebar } from '@/components/layout/sidebar';
import { SessionUIProvider } from '@/features/auth/context/session-ui-provider';
import { labelRole } from '@/features/configuracoes/roles';
import { getCurrentOrganization, getCurrentUser } from '@/lib/server-api';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();

  if (!session) redirect('/login');

  const org = session.data.tenantId ? await getCurrentOrganization() : null;
  if (org && !org.data.setupCompleted && session.data.role === 'owner') {
    redirect('/setup');
  }

  const roleText = session.data.role ? labelRole(session.data.role) : 'Sem função';

  return (
    <SessionUIProvider session={session.data}>
      <div className="flex min-h-dvh overflow-x-clip bg-background">
        <Sidebar role={session.data.role} />
        <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/75">
            <div className="flex h-14 items-center justify-between gap-3 px-4 md:h-16 md:px-6">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground lg:hidden">
                  <PackageCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-tight">
                    {org?.data.name ?? 'Café System'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {session.data.user.name} · {roleText}
                  </p>
                </div>
              </div>
              <LogoutButton />
            </div>
          </header>
          <main className="flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6 lg:pb-8">
            {children}
          </main>
          <MobileNav role={session.data.role} />
        </div>
      </div>
    </SessionUIProvider>
  );
}
