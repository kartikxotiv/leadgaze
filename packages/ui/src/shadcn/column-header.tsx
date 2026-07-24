'use client';

import * as React from 'react';

import { ArrowDown, ArrowUp, ArrowUpDown, Lock, Pencil } from 'lucide-react';

import type { SortDirection } from '../hooks/use-table-sort';
import { cn } from '../lib/utils';
import { Button } from './button';
import { TableHead } from './table';

// ─── Generic EntityField shape ────────────────────────────────────────────────
// We only need the parts that ColumnHeader actually uses, keeping this
// package free from any app-specific imports.

export interface ColumnHeaderFieldShape {
  id: string;
  field_key: string;
  is_system?: boolean;
  access_rule?: {
    access_type?: string;
  } | null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ColumnHeaderProps {
  /** Column identifier used for active-sort comparison and resize. */
  columnId: string;

  /** Visible label text. */
  label: string;

  /**
   * Optional entity-field record attached to this column.
   * Used to:
   *  - Show a custom-field dot indicator when `!field.is_system`.
   *  - Show a lock icon when `field.access_rule.access_type !== 'public'`.
   */
  field?: ColumnHeaderFieldShape | null;

  /**
   * The actual data-field key forwarded to `onSort`.
   * Supports dot-notation: 'status.status_name'.
   * Defaults to `columnId` when omitted or null.
   */
  sortKey?: string | null;

  /** From useTableSort — the currently active sort column key. */
  sortColumn?: string | null;

  /** From useTableSort — the currently active sort direction. */
  sortDirection?: SortDirection;

  /** useTableSort.toggleSort — called with the effective sort key. */
  onSort?: (key: string) => void;

  /** Whether this column is sortable. Default: true. */
  sortable?: boolean;

  /**
   * When true AND `onEditClick` is provided, a pencil icon button appears on
   * column-header hover (same as the leads page admin UX).
   */
  isAdmin?: boolean;

  /** Called when the admin pencil edit button is clicked. */
  onEditClick?: () => void;

  /** Called to delete a custom field (only shown for non-system fields). */
  onDeleteField?: (fieldId: string) => void;

  /** Whether the column is visible. Returns null when false. */
  isVisible?: boolean;

  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;

  // Legacy — kept for backward compat but ignored; use onEditClick instead.
  onUpdateField?: (...args: any[]) => void;
  onAddColumn?: () => void;
  isLastColumn?: boolean;
  onVisibilityChange?: (columnId: string, visible: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Global, generic table header cell with:
 *  - Sort icons (asc / desc / unsorted)
 *  - Active-column background tint
 *  - Custom-field dot indicator (blue dot for non-system fields)
 *  - FLS lock icon (when `field.access_rule.access_type !== 'public'`)
 *  - Admin pencil edit button on hover (when `isAdmin && onEditClick`)
 *  - Col-resize handle slot (via `children`)
 *
 * This component is intentionally **generic** — it accepts only data it needs
 * as props and does not import any app-specific hooks.
 *
 * @example
 *   <ColumnHeader
 *     label="Status"
 *     columnId="status"
 *     sortKey="status.status_name"
 *     sortColumn={sortColumn}
 *     sortDirection={sortDirection}
 *     onSort={toggleSort}
 *     sortable
 *     isAdmin={canAddColumn}
 *     field={getEntityFieldByKey('status')}
 *     onEditClick={() => openColumnEdit('status')}
 *     className="relative"
 *     {...getHeaderProps('status')}
 *   >
 *     <span className="col-resize-handle" {...getResizeHandleProps('status')} />
 *   </ColumnHeader>
 */
export function ColumnHeader({
  columnId,
  label,
  field,
  sortKey = null,
  sortColumn,
  sortDirection,
  onSort,
  sortable = true,
  isAdmin = false,
  isVisible = true,
  children,
  className,
  style,
  onEditClick,
  onUpdateField,
}: ColumnHeaderProps) {
  // Determine if this is a custom (non-system) field
  const isDynamicField = !!field && !field.is_system;

  const resolvedEditClick =
    onEditClick ??
    (onUpdateField && field ? () => onUpdateField(field.id, {}) : undefined);

  const effectiveSortKey =
    typeof sortKey === 'string' && sortKey ? sortKey : columnId;
  const isActive = sortable && sortColumn === effectiveSortKey;

  const SortIcon = isActive
    ? sortDirection === 'asc'
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  const handleClick = () => {
    if (!sortable || !onSort) return;
    const key = (typeof sortKey === 'string' && sortKey) || effectiveSortKey;
    onSort(key);
  };

  if (!isVisible) return null;

  const isRestricted =
    field?.access_rule?.access_type &&
    field.access_rule.access_type !== 'public';

  return (
    <TableHead
      className={cn(
        'group relative transition-colors duration-150 select-none',
        sortable && onSort && 'cursor-pointer',
        isActive && 'bg-primary/[0.06] dark:bg-primary/[0.10]',
        className,
      )}
      style={style}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1.5 pr-1">
        {/* Custom field indicator dot */}
        {isDynamicField && (
          <span
            className="bg-primary/60 h-1.5 w-1.5 flex-shrink-0 rounded-full"
            title="Custom Field"
          />
        )}
        <span className="flex min-w-0 flex-1 items-center gap-1 truncate">
          <span className="truncate">{label}</span>
          {isRestricted && (
            <Lock
              className="text-muted-foreground h-3 w-3"
              aria-label="Restricted field"
            />
          )}
        </span>
        {sortable && (
          <SortIcon
            className={cn(
              'h-3 w-3 shrink-0 flex-none transition-all duration-200',
              isActive
                ? 'text-leadgaze-primary opacity-100'
                : 'text-muted-foreground opacity-35',
            )}
          />
        )}
        {(isAdmin || isDynamicField) && resolvedEditClick && (
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-muted ml-2 h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              resolvedEditClick();
            }}
            title="Edit column settings"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Resize handle or other children */}
      {children}
    </TableHead>
  );
}

ColumnHeader.displayName = 'ColumnHeader';
