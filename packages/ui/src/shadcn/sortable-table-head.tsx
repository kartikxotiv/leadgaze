'use client';

import * as React from 'react';

import { ArrowDown, ArrowUp, ArrowUpDown, Pencil } from 'lucide-react';

import type { SortDirection } from '../hooks/use-table-sort';
import { cn } from '../lib/utils';
import { TableHead } from './table';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SortableTableHeadProps
  extends Omit<React.ThHTMLAttributes<HTMLTableCellElement>, 'onClick'> {
  /**
   * Display identifier for this column — used to determine the active state.
   * Usually matches the column definition ID (e.g. 'name', 'status').
   */
  columnId: string;

  /**
   * The actual data-field key forwarded to `toggleSort`.
   * Supports dot-notation for nested values: e.g. 'status.status_name'.
   * Defaults to `columnId` when omitted.
   *
   * Use this when the display column ID differs from the underlying field name,
   * e.g. columnId="company" sortKey="company_name"
   */
  sortKey?: string;

  /** From useTableSort — the currently active sort column key */
  sortColumn: string | null;

  /** From useTableSort — the currently active sort direction */
  sortDirection: SortDirection;

  /** useTableSort.toggleSort — called with effectiveSortKey on click */
  onSort: (key: string) => void;

  /** The visible header label text */
  label: React.ReactNode;

  /**
   * Whether this column is sortable. Default: true.
   * Pass false for columns like "S.No.", "Score" (computed), or "Actions".
   */
  sortable?: boolean;

  /**
   * Extra children rendered after the label row (e.g. the col-resize-handle span).
   * These are rendered outside the flex label row so absolutely-positioned
   * elements (resize handles) continue to work correctly.
   */
  children?: React.ReactNode;

  /**
   * Optional callback for an admin edit action. When provided, a pencil icon
   * button appears on hover (top-right of the header cell).
   */
  onEditClick?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Drop-in replacement for <TableHead> that adds interactive sort icons and
 * active-column highlighting.
 *
 * Icon behaviour:
 *  - Unsorted column:  ArrowUpDown fades in on hover (muted)
 *  - Asc active:       ArrowUp in primary colour + subtle bg tint
 *  - Desc active:      ArrowDown in primary colour + subtle bg tint
 *  - Third click:      sort cleared, returns to unsorted state
 *
 * Server-sort migration: zero changes here — update the hook `mode` and
 * forward `sortState` to your React Query key on the page.
 *
 * @example
 *   <SortableTableHead
 *     label="Name"
 *     columnId="name"
 *     sortKey="first_name"
 *     sortColumn={sortColumn}
 *     sortDirection={sortDirection}
 *     onSort={toggleSort}
 *     className="relative"
 *     {...getHeaderProps('name')}
 *   >
 *     <span className="col-resize-handle" {...getResizeHandleProps('name')} />
 *   </SortableTableHead>
 */
export const SortableTableHead: React.FC<SortableTableHeadProps> = ({
  columnId,
  sortKey,
  sortColumn,
  sortDirection,
  onSort,
  label,
  sortable = true,
  className,
  children,
  style,
  onEditClick,
  ...props
}) => {
  const effectiveSortKey = sortKey ?? columnId;
  const isActive = sortable && sortColumn === effectiveSortKey;
  const SortIcon = isActive
    ? sortDirection === 'asc'
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <TableHead
      className={cn(
        'group/sort relative transition-colors duration-150 select-none',
        sortable && 'cursor-pointer',
        isActive && 'bg-primary/[0.06] dark:bg-primary/[0.10]',
        className,
      )}
      style={style}
      onClick={sortable ? () => onSort(effectiveSortKey) : undefined}
      aria-sort={sortable && isActive ? sortDirection : undefined}
      {...props}
    >
      <div className="flex items-center gap-1.5 pr-4">
        <span className="flex-1 truncate">{label}</span>
        {sortable && (
          <SortIcon
            className={cn(
              'h-3 w-3 shrink-0 transition-all duration-200',
              isActive
                ? 'text-leadgaze-primary opacity-100'
                : 'text-muted-foreground opacity-35',
            )}
          />
        )}
      </div>
      {children}
      {onEditClick && (
        <div className="absolute top-1/2 right-5 -translate-y-1/2 opacity-0 transition-opacity group-hover/sort:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditClick();
            }}
            title="Edit column settings"
            className="hover:bg-muted text-muted-foreground hover:text-foreground flex h-5 w-5 items-center justify-center rounded"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      )}
    </TableHead>
  );
};

SortableTableHead.displayName = 'SortableTableHead';
