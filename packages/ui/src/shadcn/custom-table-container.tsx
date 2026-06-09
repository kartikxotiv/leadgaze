import * as React from 'react';
import { cn } from '../lib/utils';
import { Card, CardContent } from './card';

export interface CustomTableContainerProps {
  /** The table markup (including <Table>, <TableHeader>, <TableBody>, etc.) */
  children: React.ReactNode;
  /** Optional pagination component placed below the table */
  pagination?: React.ReactNode;
  /** Additional classes for the outer flex container (the one that previously had
   *  "flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col space-y-4") */
  className?: string;
  /** Override the inner listing‑table‑container class string if a page needs custom overflow/padding */
  containerClass?: string;
  /** Optional slot rendered above the table (e.g. filter bar, action buttons) */
  headerActions?: React.ReactNode;
  /** Optional slot rendered below pagination (e.g. "Showing X‑Y of Z entries") */
  footerExtras?: React.ReactNode;
}

/**
 * Reusable wrapper that matches the layout used on the Leads page.
 *
 * It does **not** dictate the shape of the table head or rows – those are
 * supplied by the caller via the `children` prop, preserving per‑page custom
 * column definitions.
 */
export const CustomTableContainer: React.FC<CustomTableContainerProps> = ({
  children,
  pagination = null,
  className = '',
  containerClass = 'listing-table-container card-container border-b-0 no-raidus min-w-0 overflow-x-auto overflow-y-auto pb-0 [&>div]:overflow-visible',
  headerActions,
  footerExtras,
}) => {
  return (
    <div className={cn('flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col space-y-4', className)}>
      {headerActions && <div className="mb-2">{headerActions}</div>}
      <Card className="flex min-h-0 w-full max-w-full min-w-0 flex-col border-none shadow-none mb-0">
        <CardContent className="flex min-h-0 w-full max-w-full min-w-0 flex-col p-0">
          <div className={cn(containerClass)}>{children}</div>
        </CardContent>
      </Card>
      {pagination && <div className="mt-2">{pagination}</div>}
      {footerExtras && <div className="mt-1">{footerExtras}</div>}
    </div>
  );
};

export default CustomTableContainer;
