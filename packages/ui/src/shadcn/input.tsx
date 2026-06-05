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
        'border-[#B0B0B0] bg-white file:text-foreground hover:border-ring/50 placeholder:text-muted-foreground focus-visible:ring-ring flex h-[37.5px] w-full rounded-[4px] border bg-transparent px-3 py-1 text-base shadow-2xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400',
        className,
      )}
      {...props}
    />
  );
};

Input.displayName = 'Input';

export { Input };
