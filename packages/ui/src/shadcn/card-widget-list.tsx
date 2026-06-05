import * as React from 'react';

import { cn } from '../lib/utils';

export interface CardWidgetListProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardWidgetList({
  children,
  className,
  ...props
}: CardWidgetListProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)} {...props}>
      {children}
    </div>
  );
}

export interface CardWidgetListItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'content'> {
  /** Optional icon or avatar on the left */
  icon?: React.ReactNode;
  /** Primary title of the item */
  title?: React.ReactNode;
  /** Secondary subtitle below the title */
  subtitle?: React.ReactNode;
  /** Right-aligned badge or status component */
  badge?: React.ReactNode;
  /** Main text content or description (can be multi-line/custom elements) */
  content?: React.ReactNode;
  /** Muted metadata text or row at the bottom (e.g. "John Smith • 09/04/2026, 15:00") */
  metadata?: React.ReactNode;
  /** Optional action buttons visible on hover or always (e.g. edit, delete) */
  actions?: React.ReactNode;
}

export function CardWidgetListItem({
  icon,
  title,
  subtitle,
  badge,
  content,
  metadata,
  actions,
  className,
  ...props
}: CardWidgetListItemProps) {
  return (
    <div
      className={cn(
        'group relative flex min-h-[53.205px] items-center justify-between gap-3 rounded-[4px] border-[0.6px] border-[#B0B0B0] bg-white p-2 opacity-100 transition-colors hover:bg-gray-50/50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800/50',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <div className="flex min-h-[36px] min-w-0 flex-1 flex-col justify-center px-3">
          {(title || badge) && (
            <div className="flex items-center justify-between gap-2">
              {title && (
                <div className="h-5 truncate text-sm leading-5 font-semibold text-gray-900 dark:text-zinc-100">
                  {title}
                </div>
              )}
              {badge && <div className="flex-shrink-0">{badge}</div>}
            </div>
          )}
          {subtitle && (
            <div className="text-muted-foreground h-4 truncate text-xs leading-4">
              {subtitle}
            </div>
          )}
          {content && (
            <div className="mt-1.5 text-sm break-words whitespace-pre-wrap text-gray-700 dark:text-zinc-300">
              {content}
            </div>
          )}
          {metadata && (
            <div className="text-muted-foreground mt-1.5 flex items-center gap-1 text-xs">
              {metadata}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div className="ml-3 flex flex-shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
}

export interface CardWidgetTimelineItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Icon to render inside the timeline dot */
  icon?: React.ReactNode;
  /** Custom background / text color class for the icon circle */
  iconClassName?: string;
  /** Primary title of the timeline item */
  title?: React.ReactNode;
  /** Secondary description below the title */
  description?: React.ReactNode;
  /** Timestamp/date to show */
  timestamp?: React.ReactNode;
  /** Whether this is the last item (hides bottom connector line) */
  isLast?: boolean;
}

export function CardWidgetTimelineItem({
  icon,
  iconClassName,
  title,
  description,
  timestamp,
  isLast = false,
  className,
  ...props
}: CardWidgetTimelineItemProps) {
  return (
    <div className={cn('flex gap-4', className)} {...props}>
      <div className="flex flex-shrink-0 flex-col items-center">
        {/* Dot/Icon circle */}
        <div
          className={cn(
            'relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold shadow-xs',
            iconClassName ||
              'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300',
          )}
        >
          {icon}
        </div>
        {/* Vertical Connector Line */}
        {!isLast && (
          <div className="my-1 w-0.5 flex-1 bg-gray-200 dark:bg-zinc-800" />
        )}
      </div>
      {/* Content block */}
      <div className="min-w-0 flex-1 pb-6">
        {title && (
          <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-zinc-100">
            {title}
          </h4>
        )}
        {description && (
          <p className="mt-0.5 text-sm break-words text-gray-600 dark:text-zinc-400">
            {description}
          </p>
        )}
        {timestamp && (
          <span className="text-muted-foreground mt-1.5 block text-xs">
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}
