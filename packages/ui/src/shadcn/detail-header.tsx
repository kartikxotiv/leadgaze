import * as React from 'react';
import { Mail } from 'lucide-react';
import { cn } from '../lib/utils';

interface DetailHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  avatar?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  email?: string;
  actions?: React.ReactNode;
  right?: React.ReactNode;
}

export function DetailHeader({
  avatar,
  title,
  subtitle,
  email,
  actions,
  right,
  className,
  ...props
}: DetailHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-none border border-leadgaze-border bg-card p-2 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:bg-card/50 mb-2',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        {avatar && (
          <div className="flex shrink-0 items-center justify-center">
            {avatar}
          </div>
        )}
        <div className="space-y-0.5">
          {typeof title === 'string' ? (
            <h1 className="primary-heading text-leadgaze-dark dark:text-white">
              {title}
            </h1>
          ) : (
            title
          )}

          {subtitle && (
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 secondary-text-small">
              {subtitle}
            </div>
          )}

          {email && (
            <div className="flex items-center gap-1.5 text-sm">
              <Mail className="text-muted-foreground h-3.5 w-3.5" />
              <a
                href={`mailto:${email}`}
                className="text-blue-600 hover:underline dark:text-blue-400 primary-text-regular"
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

      {right && (
        <div className="flex shrink-0 items-center sm:ml-auto">
          {right}
        </div>
      )}
    </div>
  );
}
