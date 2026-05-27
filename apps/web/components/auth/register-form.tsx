'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { slugify } from '@/lib/utils';

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cafeName, setCafeName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const effectiveSlug = useMemo(() => slug || slugify(cafeName), [cafeName, slug]);

  function updateCafeName(value: string) {
    setCafeName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signUpError } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message ?? 'Não foi possível criar a conta.');
      return;
    }

    const { error: organizationError } = await authClient.organization.create({
      name: cafeName,
      slug: effectiveSlug,
    });

    setLoading(false);

    if (organizationError) {
      setError(organizationError.message ?? 'Não foi possível criar o café.');
      return;
    }

    router.replace('/setup');
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                autoComplete="name"
                id="name"
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                autoComplete="email"
                id="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              autoComplete="new-password"
              id="password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cafeName">Café</Label>
              <Input
                id="cafeName"
                onChange={(event) => updateCafeName(event.target.value)}
                required
                value={cafeName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(slugify(event.target.value));
                }}
                required
                value={effectiveSlug}
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button className="w-full" disabled={loading} type="submit">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Criar conta
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
