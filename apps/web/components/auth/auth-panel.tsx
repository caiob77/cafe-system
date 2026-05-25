import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthPanel({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer: {
    label: string;
    href: string;
    text: string;
  };
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[1fr_520px]">
        <section className="hidden bg-[linear-gradient(rgba(17,40,35,0.72),rgba(17,40,35,0.7)),url('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center lg:block">
          <div className="flex h-full max-w-3xl flex-col justify-end px-14 py-14 text-white">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-white/70">
              Café System
            </p>
            <h1 className="text-5xl font-semibold leading-tight">
              Operação de balcão, mesa e caixa.
            </h1>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-[420px]">
            <div className="mb-8">
              <p className="mb-2 text-sm font-medium uppercase tracking-widest text-primary">
                Café System
              </p>
              <h2 className="text-3xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>

            {children}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {footer.text}{' '}
              <Link className="font-medium text-primary hover:underline" href={footer.href}>
                {footer.label}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
