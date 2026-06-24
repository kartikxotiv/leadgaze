'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { cn } from '../lib/utils';
import type { SortDirection } from '../hooks/use-table-sort';
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
  ...props
}) => {
  const effectiveSortKey = sortKey ?? columnId;
  const isActive = sortable && sortColumn === effectiveSortKey;

  const SortIcon = isActive
    ? sortDirection === 'asc'
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  // Non-sortable: render a plain TableHead with no interaction
  if (!sortable) {
    return (
      <TableHead className={className} style={style} {...props}>
        {label}
        {children}
      </TableHead>
    );
  }

  return (
    <TableHead
      className={cn(
        'group/sort cursor-pointer select-none transition-colors duration-150',
        isActive && 'bg-primary/[0.06] dark:bg-primary/[0.10]',
        className,
      )}
      style={style}
      onClick={() => onSort(effectiveSortKey)}
      {...props}
    >
      {/*
        Label + sort icon in a flex row.
        pr-4 keeps content clear of the absolutely-positioned resize handle
        which sits at the far-right edge of the <th>.
      */}
      <div className="flex items-center gap-1.5 pr-4">
        <span className="flex-1 truncate">{label}</span>
        <SortIcon
          className={cn(
            'h-3 w-3 shrink-0 transition-all duration-200',
            isActive
              ? 'text-leadgaze-primary opacity-100'
              : 'text-muted-foreground opacity-35',
          )}
        />
      </div>
      {/*
        Extra children (e.g. resize handle <span>) rendered outside the flex
        row so they remain absolutely positioned relative to the <th>, not
        the flex container.
      */}
      {children}
    </TableHead>
  );
};

SortableTableHead.displayName = 'SortableTableHead';
