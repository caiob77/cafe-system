import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type BackLinkProps = {
  href: string;
  children: React.ReactNode;
};

export function BackLink({ href, children }: BackLinkProps) {
  return (
    <Link
      className="inline-flex h-10 w-fit items-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      href={href}
    >
      <ArrowLeft className="h-4 w-4" />
      {children}
    </Link>
  );
}
