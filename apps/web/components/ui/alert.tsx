import { type VariantProps, cva } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/lib/utils';

const alertVariants = cva('flex w-full gap-3 rounded-md border px-3 py-2 text-sm', {
  variants: {
    variant: {
      default: 'border-border bg-muted/40 text-foreground',
      info: 'border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200',
      success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
      warning: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200',
      destructive: 'border-destructive/25 bg-destructive/10 text-destructive',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps) {
  return <div className={cn(alertVariants({ variant, className }))} role="status" {...props} />;
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('font-medium leading-none', className)} {...props} />;
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm opacity-90', className)} {...props} />;
}
