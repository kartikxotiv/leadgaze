import * as React from 'react';

import { cn } from '../lib/utils';

export type TextareaProps = React.ComponentPropsWithRef<'textarea'>;

const Textarea: React.FC<TextareaProps> = ({ className, ...props }) => {
  return (
    <textarea
      className={cn(
        'border-leadgaze-border placeholder:text-muted-foreground focus-visible:ring-0 flex min-h-[77.18px] w-full rounded-[4px] border bg-transparent px-3 py-2 text-sm shadow-none focus-visible:border-primary/50 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
};

Textarea.displayName = 'Textarea';

export { Textarea };
