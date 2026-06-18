'use client';

import * as React from 'react';
import { ListFilter } from 'lucide-react';

import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { TableStatusMetricTab } from './table-status-metric-tab';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StatusFilterItem {
  id: string;
  status_name: string;
  color?: string;
}

export interface StatusBreakdown {
  [id: string]: { count: number };
}

export interface StatusFilterDropdownProps {
  /** List of status options (excluding "All") */
  statuses: StatusFilterItem[];
  /** Currently selected status id. Use `'all'` for the "All" option. */
  selectedStatus: string;
  /** Called when the user picks a status. Receives the status id (or `'all'`). */
  onStatusChange: (statusId: string) => void;
  /** Map of statusId → { count } returned by the server query */
  statusBreakdown: StatusBreakdown;
  /** Total count shown on the "All" option */
  totalCount: number;
  /** Label for the "all" option. Defaults to `"All"` */
  allLabel?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Compact icon-button that opens a dropdown of status filters.
 * Each option renders via `TableStatusMetricTab` so the visual language
 * (color dot, uppercase name, count, selected highlight) stays consistent
 * whether the tabs appear inline or inside a dropdown.
 *
 * Designed to be passed as the `statusSlot` prop of `ListToolBar`.
 */
export const StatusFilterDropdown: React.FC<StatusFilterDropdownProps> = ({
  statuses,
  selectedStatus,
  onStatusChange,
  statusBreakdown,
  totalCount,
  allLabel = 'All',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (id: string) => {
    onStatusChange(id);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label="Filter by status"
        >
          <ListFilter className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-auto min-w-[220px] p-2">
        {/* "All" option */}
        <DropdownMenuItem
          className="p-0 focus:bg-transparent"
          onSelect={(e) => e.preventDefault()}
        >
          <TableStatusMetricTab
            id="all"
            statusName={allLabel}
            count={totalCount}
            isSelected={selectedStatus === 'all'}
            onClick={() => handleSelect('all')}
            cardClassName="w-full"
            cardContentClassName="px-3 py-2"
          />
        </DropdownMenuItem>

        {/* Individual statuses */}
        {statuses.map((status) => {
          const stats = statusBreakdown[status.id] || { count: 0 };
          const isSelected = selectedStatus === status.id;
          const displayCount =
            selectedStatus === 'all'
              ? stats.count
              : isSelected
                ? stats.count
                : 0;

          return (
            <DropdownMenuItem
              key={status.id}
              className="p-0 focus:bg-transparent"
              onSelect={(e) => e.preventDefault()}
            >
              <TableStatusMetricTab
                id={status.id}
                color={status.color}
                statusName={status.status_name}
                count={displayCount}
                isSelected={isSelected}
                onClick={() => handleSelect(status.id)}
                cardClassName="w-full"
                cardContentClassName="px-3 py-2"
              />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
