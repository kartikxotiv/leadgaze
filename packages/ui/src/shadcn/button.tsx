import * as React from 'react';

import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

const buttonVariants = cva(
  'focus-visible:ring-ring inline-flex items-center justify-center rounded-[4px] text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-1 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs dark:bg-leadgaze-primary dark:text-white dark:hover:bg-leadgaze-primary',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs',
        outline:
          'border-input bg-background hover:bg-accent hover:text-accent-foreground border shadow-xs',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-xs',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'decoration-primary underline-offset-4 hover:underline',
        notactive: 'bg-white primary-text-medium text-leadgaze-dark hover:bg-white shadow-xs'
      },
      size: {
        default: 'h-[36px] px-4 py-2',
        sm: 'h-8 rounded-[4px] px-3 text-xs',
        lg: 'h-10 rounded-[4px] px-8',
        icon: 'h-[36px] w-[36px]',
        pagination: 'h-[20px] px-2 py-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ComponentPropsWithRef<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  className,
  variant,
  size,
  asChild = false,
  ...props
}) => {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
};

Button.displayName = 'Button';

export { Button, buttonVariants };
