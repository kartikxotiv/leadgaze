import * as React from 'react';

import { cn } from '../lib/utils';

interface CardWidgetContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  icon2?: React.ReactNode;
  hideHeaderBorder?: boolean;
  headerClassName?: string;
  contentClassName?: string;
  desc?: string;
  hideBorderBottom?: boolean;
}

export function CardWidgetContainer({
  title,
  description,
  icon,
  icon2,
  hideHeaderBorder = false,
  headerClassName,
  contentClassName,
  children,
  className,
  desc,
  hideBorderBottom = false,
  ...props
}: CardWidgetContainerProps) {
  return (
    <div
      className={cn(
        hideBorderBottom && 'border-b-0',
        'card-container flex flex-col overflow-hidden rounded-xl bg-white dark:bg-zinc-900',
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          'flex items-center justify-between',
          hideHeaderBorder
            ? 'px-6 pt-4 pb-2 xl:px-4 xl:pt-3 xl:pb-1.5 2xl:px-6 2xl:pt-4 2xl:pb-2'
            : 'card-seperator-border border-b px-6 py-4 xl:px-4 xl:py-3 2xl:px-6 2xl:py-4',
          headerClassName,
        )}
      >
        <div className="flex flex-col gap-0.5">
          <h2 className="primary-heading text-leadgaze-dark flex items-center gap-1.5 dark:text-zinc-100">
            {icon} {title}
          </h2>
          {description && (
            <p className="text-xs text-muted-foreground font-normal">
              {description}
            </p>
          )}
        </div>
        {icon2}
      </div>
      <div className={cn('flex-1', contentClassName)}>{children}</div>
    </div>
  );
}
