import React from 'react';

import { cn } from '../../lib/utils';
import { CardDescription, CardHeader, CardTitle } from '../../shadcn/card';

interface FeatureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  description: string;
  icon?: React.ReactNode;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  className,
  label,
  description,
  icon,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-3xl border bg-white/50 p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl dark:bg-gray-950/50',
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-4">
        {icon && (
          <div className="bg-primary/10 text-primary group-hover:bg-primary flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-500 group-hover:scale-110 group-hover:text-white">
            {icon}
          </div>
        )}

        <div className="space-y-2">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {label}
          </CardTitle>

          <CardDescription className="text-muted-foreground max-w-sm text-base leading-relaxed font-medium">
            {description}
          </CardDescription>
        </div>

        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
};
