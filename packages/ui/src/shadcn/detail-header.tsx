import * as React from 'react';
import { Mail } from 'lucide-react';
import { cn } from '../lib/utils';

interface DetailHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  avatar?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  email?: string;
  actions?: React.ReactNode;
}

export function DetailHeader({
  avatar,
  title,
  subtitle,
  email,
  actions,
  className,
  ...props
}: DetailHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-none border border-leadgaze-border bg-card p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:bg-card/50',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-4">
        {avatar && (
          <div className="flex shrink-0 items-center justify-center">
            {avatar}
          </div>
        )}
        <div className="space-y-1.5">
          {typeof title === 'string' ? (
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
          ) : (
            title
          )}

          {subtitle && (
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {subtitle}
            </div>
          )}

          {email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="text-muted-foreground h-4 w-4" />
              <a
                href={`mailto:${email}`}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {email}
              </a>
            </div>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
