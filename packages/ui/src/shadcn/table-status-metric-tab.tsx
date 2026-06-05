import * as React from 'react';
import { cn } from '../lib/utils';
import { Card, CardContent } from './card';
/**
 * Props for the TableStatusMetricTab component.
 */
export interface TableStatusMetricTabProps {
  /** Unique identifier for the status */
  id?: string | number | undefined;
  /** Background colour for the status dot */
  color?: string; // optional background colour for the dot
  statusName?: string; // optional human‑readable name
  count?: number; // optional count, defaults to 0 to display alongside the status name
  /** Whether this status is currently selected */
  isSelected?: boolean; // optional, defaults to false
  /** Click handler – receives the status id */
  onClick?: (id?: string | number) => void; // optional, defaults to noop
  /** Optional additional class names for the root Card */
  className?: string;
  /** Optional class names for the Card wrapper */
  cardClassName?: string;
  /** Optional class names for the CardContent wrapper */
  cardContentClassName?: string;
}

/**
 * Re‑usable card component used in the Leads table header to show status metrics.
 * It mirrors the original Card markup from `apps/web/app/home/leads/page.tsx`
 * but abstracts the UI into a component. The click handler is passed in as a
 * prop, so any state defined in the parent (e.g. `setSelectedStatus`) works
 * unchanged.
 */
export const TableStatusMetricTab: React.FC<TableStatusMetricTabProps> = ({
  id,
  color,
  statusName,
  count,
  isSelected = false,
  onClick = () => {},
  className = '',
  cardClassName = '',
  cardContentClassName = '',
}) => {
  return (
    <Card
      key={id}
      className={cn(
        'hover:border-primary/50 bg-card inline-flex w-auto shrink-0 cursor-pointer rounded-sm-card transition-all',
        isSelected && 'border-primary table-status-select-bg dark:dark-table-status-select-bg',
        className,
        cardClassName
      )}
      onClick={() => onClick?.(id)}
    >
      <CardContent className={cn('flex items-center px-3 py-2', cardContentClassName)}>
        <div className="flex items-center gap-2 whitespace-nowrap">
          {color && <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
          <span className={cn("primary-text-medium text-leadgaze-dark uppercase dark:text-white", isSelected && "text-primary")}>
            {statusName} ({count})
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
