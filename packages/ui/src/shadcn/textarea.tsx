import * as React from 'react';

import { cn } from '../lib/utils';

export type TextareaProps = React.ComponentPropsWithRef<'textarea'>;

const Textarea: React.FC<TextareaProps> = ({ className, ...props }) => {
  return (
    <textarea
      className={cn(
        'border-[#B0B0B0] bg-white placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[77.18px] w-full rounded-[4px] border px-3 py-2 text-sm shadow-none focus-visible:ring-1 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-white disabled:border-[#B0B0B0] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400 dark:disabled:bg-slate-900 dark:disabled:border-slate-700',
        className,
      )}
      {...props}
    />
  );
};

Textarea.displayName = 'Textarea';

export { Textarea };
