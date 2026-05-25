'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await authClient.signOut();
    setLoading(false);
    router.replace('/login');
    router.refresh();
  }

  return (
    <Button
      aria-label="Sair"
      disabled={loading}
      onClick={logout}
      size="icon"
      title="Sair"
      type="button"
      variant="ghost"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
