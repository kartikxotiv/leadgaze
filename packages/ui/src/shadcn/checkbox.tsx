'use client';

import * as React from 'react';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { CheckIcon } from '@radix-ui/react-icons';

import { cn } from '../lib/utils';

export interface CheckboxProps
  extends React.ComponentPropsWithRef<typeof CheckboxPrimitive.Root> {
  isRadio?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({ className, isRadio, ...props }) => (
  <CheckboxPrimitive.Root
    className={cn(
      'peer focus-visible:ring-ring shrink-0 border shadow-xs focus-visible:ring-1 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
      isRadio
        ? 'h-[16px] w-[16px] rounded-full border-[#18181B]'
        : 'border-[#E9E9E9] data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground h-[18px] w-[18px] rounded-[4px]',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn('flex items-center justify-center text-current')}
    >
      {isRadio ? (
        <div className="h-[10px] w-[10px] rounded-full bg-[#3953E7]" />
      ) : (
        <CheckIcon className="h-[14px] w-[14px]" />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
