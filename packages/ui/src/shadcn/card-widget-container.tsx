import * as React from 'react';

import { cn } from '../lib/utils';

interface CardWidgetContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  icon?: React.ReactNode;
  icon2?: React.ReactNode;
  hideHeaderBorder?: boolean;
  headerClassName?: string;
  contentClassName?: string;
}

export function CardWidgetContainer({
  title,
  icon,
  icon2,
  hideHeaderBorder = false,
  headerClassName,
  contentClassName,
  children,
  className,
  ...props
}: CardWidgetContainerProps) {
  return (
    <div
      className={cn(
        'card-container flex flex-col overflow-hidden rounded-xl bg-white dark:bg-zinc-900',
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          'flex items-center justify-between',
          hideHeaderBorder
            ? 'px-6 pt-6 pb-3 xl:px-4 xl:pt-4 xl:pb-2 2xl:px-6 2xl:pt-6 2xl:pb-3'
            : 'card-seperator-border dark:card-seperator-border border-b p-6 xl:p-4 2xl:p-6',
          headerClassName,
        )}
      >
        <h2 className="primary-heading text-leadgaze-dark flex items-center gap-1.5 dark:text-zinc-100">
          {icon} {title}
        </h2>
        {icon2}
      </div>
      <div className={cn('flex-1', contentClassName)}>{children}</div>
    </div>
  );
}
