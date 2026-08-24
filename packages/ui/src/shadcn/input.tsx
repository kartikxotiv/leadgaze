'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { cn } from '../lib/utils';

export type InputProps = React.ComponentPropsWithRef<'input'>;

const Input: React.FC<InputProps> = ({
  className,
  type = 'text',
  ...props
}) => {
  const [showPassword, setShowPassword] = React.useState(false);

  const isPassword = type === 'password';

  return (
    <>
      <input
        type={isPassword && showPassword ? 'text' : type}
        className={cn(
          'border-gray-300 bg-transparent text-gray-900 placeholder:text-muted-foreground focus-visible:ring-0 flex h-[36px] w-full rounded-[4px] border px-3 py-1 text-base shadow-none transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:border-primary/50 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:text-white dark:border-slate-700',
          isPassword && 'pr-10',
          className,
        )}
        {...props}
      />

      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      )}
    </>
  );
};

Input.displayName = 'Input';

export { Input };