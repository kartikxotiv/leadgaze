import * as React from 'react';

import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { cn } from '../lib/utils';

export interface CustomInputForViewProps {
  label: string;
  labelIcon?: React.ReactNode;
  isRequired?: boolean;
  value?: React.ReactNode;
  className?: string;
  as?: 'input' | 'textarea';
}

export function CustomInputForView({
  label,
  labelIcon,
  isRequired = false,
  value,
  className,
  as = 'input',
}: CustomInputForViewProps) {
  const isPrimitive = typeof value === 'string' || typeof value === 'number' || value === undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label className="flex items-center gap-1.5">
        {labelIcon && <span className="text-leadgaze-muted dark:text-gray-400">{labelIcon}</span>}
        <span>{label}</span>
        {isRequired && <span className="text-red-500">*</span>}
      </Label>
      {isPrimitive ? (
        as === 'textarea' ? (
          <Textarea 
            value={(value as string | number) ?? ''} 
            disabled 
            readOnly 
            className="disabled:opacity-100 min-h-[80px]"
          />
        ) : (
          <Input 
            value={(value as string | number) ?? ''} 
            disabled 
            readOnly 
            className="disabled:opacity-100"
          />
        )
      ) : (
        <div className="flex min-h-[37.5px] w-full items-center rounded-[4px] border border-leadgaze-border bg-white px-3 py-1 text-base shadow-2xs md:text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          {value}
        </div>
      )}
    </div>
  );
}
