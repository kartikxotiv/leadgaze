'use client';

import React from 'react';

import { ArrowDown, ArrowUp, ArrowUpDown, Lock, Pencil } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { TableHead } from '@kit/ui/table';
import type { SortDirection } from '@kit/ui/use-table-sort';
import { cn } from '@kit/ui/utils';

import type { EntityField } from '~/lib/hooks/use-dynamic-columns';

interface ColumnHeaderProps {
  columnId: string;
  label: string;
  field?: EntityField | null;
  sortColumn?: string | null;
  sortDirection?: SortDirection;
  onSort?: (key: string) => void;
  /** Optional explicit sort key (useful for system fields with different sort keys) */
  sortKey?: string | null;
  sortable?: boolean;
  isVisible?: boolean;
  isAdmin?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Called when the pencil edit button is clicked. Modal is managed at page level. */
  onEditClick?: () => void;
  onDeleteField?: (fieldId: string) => void;
  // Legacy – kept for backward compat but ignored; use onEditClick instead
  onUpdateField?: (...args: any[]) => void;
  onAddColumn?: () => void;
  isLastColumn?: boolean;
  onVisibilityChange?: (columnId: string, visible: boolean) => void;
}

export function ColumnHeader({
  columnId,
  label,
  field,
  sortColumn,
  sortDirection,
  onSort,
  sortKey = null,
  sortable = true,
  isVisible = true,
  isAdmin = false,
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

  const effectiveSortKey = typeof sortKey === 'string' && sortKey ? sortKey : columnId;
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
        {isAdmin && resolvedEditClick && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 hover:bg-muted h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
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
