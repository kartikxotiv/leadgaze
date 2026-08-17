import * as React from 'react';

import { cn } from '../lib/utils';

export type InputProps = React.ComponentPropsWithRef<'input'>;

const Input: React.FC<InputProps> = ({
  className,
  type = 'text',
  ...props
}) => {
  return (
    <input
      type={type}
      className={cn(
        'border-gray-300 bg-transparent text-gray-900 placeholder:text-muted-foreground focus-visible:ring-0 flex h-[36px] w-full rounded-[4px] border px-3 py-1 text-base shadow-none transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:border-primary/50 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:text-white dark:border-slate-700',
        className,
      )}
      {...props}
    />
  );
};

Input.displayName = 'Input';

export { Input };
