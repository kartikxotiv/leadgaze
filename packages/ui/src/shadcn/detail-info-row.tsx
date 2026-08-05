import * as React from 'react';

import { cn } from '../lib/utils';

export interface DetailInfoRowProps {
  /** Icon element to display before the label */
  icon: React.ReactNode;
  /** Label text for the field */
  label: string;
  /** Value to display – can be a string, number, or any ReactNode (e.g. a link) */
  value: React.ReactNode;
  /** Optional className for the row container */
  className?: string;
  /** Optional width class for the label column (default: w-24) */
  labelWidth?: string;
}

/**
 * A compact single-line detail row: Icon → Label → Value.
 * Used inside accordion sections on entity detail pages.
 */
export function DetailInfoRow({
  icon,
  label,
  value,
  className,
  labelWidth = 'w-26',
}: DetailInfoRowProps) {
  return (
    <div className={cn('flex items-center gap-2 py-2.5 justify-between', className)}>
        <div className="flex gap-2">
        <span className="text-muted-foreground shrink-0">{icon}</span>
        <span
            className={cn(
            'shrink-0 primary-text-medium text-leadgaze-dark dark:text-white',
            labelWidth,
            )}
        >
            {label}
        </span>
      </div>
      <span className="truncate text-sm text-gray-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}

export interface DetailInfoListProps {
  /** DetailInfoRow children */
  children: React.ReactNode;
  /** Optional className for the list container */
  className?: string;
}

/**
 * A vertical list container for DetailInfoRow items.
 * Applies consistent spacing between rows.
 */
export function DetailInfoList({ children, className }: DetailInfoListProps) {
  return <div className={cn('flex flex-col divide-y divide-slate-100 dark:divide-slate-800', className)}>{children}</div>;
}
