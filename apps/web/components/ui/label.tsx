import * as React from 'react';

import { cn } from '@/lib/utils';

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  // biome-ignore lint/a11y/noLabelWithoutControl: this primitive receives htmlFor from each form usage.
  <label
    className={cn('text-sm font-medium leading-none text-foreground', className)}
    ref={ref}
    {...props}
  />
));
Label.displayName = 'Label';
