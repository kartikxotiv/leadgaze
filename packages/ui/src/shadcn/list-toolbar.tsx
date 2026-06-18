'use client';

import * as React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  LucideIcon,
} from 'lucide-react';

import { cn } from '../lib/utils';
import { Button } from './button';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

export interface FilterGroup {
  key: string;
  label: string;
  selectedValue?: string;
  options: FilterOption[];
  onSelect: (value: string) => void;
  selectedLabel?: string;
}

export interface ToolbarAction {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  className?: string;
  show?: boolean;
  /**
   * - `'pill'`  → icon + text label (default)
   * - `'icon'`  → icon-only square button
   */
  variant?: 'icon' | 'pill';
  /**
   * Shadcn Button variant. Defaults to `'outline'`.
   * Pass `'default'` for the primary-coloured action (e.g. "+ New Lead").
   */
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
  /** Extra class names forwarded to the Button */
  pillClassName?: string;
}

export interface ListToolBarProps {
  // ── Search ─────────────────────────────────────────────────────────────────
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;

  // ── Filter ─────────────────────────────────────────────────────────────────
  showFilter?: boolean;
  /** Label shown on the filter trigger button. Defaults to "Show Filters". */
  filterLabel?: string;
  filterGroups?: FilterGroup[];
  activeFilterCount?: number;
  onClearFilters?: () => void;

  // ── Actions ────────────────────────────────────────────────────────────────
  actions?: ToolbarAction[];

  // ── Column-visibility slot ─────────────────────────────────────────────────
  columnVisibilitySlot?: React.ReactNode;

  // ── Status filter slot (e.g. a dropdown replacing inline metric tabs) ──────
  statusSlot?: React.ReactNode;

  // ── Root ───────────────────────────────────────────────────────────────────
  /**
   * Controls the toolbar's width and horizontal alignment.
   * - `'full'`  → always stretches to full width (default when `showSearch` is true)
   * - `'left'`  → shrinks to content, aligned to the left
   * - `'right'` → shrinks to content, pushed to the right via `ml-auto`
   * When omitted and `showSearch` is false, defaults to `'left'`.
   */
  align?: 'left' | 'right' | 'full';
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ListToolBar: React.FC<ListToolBarProps> = ({
  showSearch = false,
  searchPlaceholder = 'Search…',
  searchValue = '',
  onSearchChange,
  showFilter = false,
  filterLabel = 'Show Filters',
  filterGroups = [],
  activeFilterCount = 0,
  onClearFilters,
  actions = [],
  columnVisibilitySlot,
  statusSlot,
  align,
  className,
}) => {
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [filterView, setFilterView] = React.useState<string>('main');

  const handleFilterOpenChange = (open: boolean) => {
    setIsFilterOpen(open);
    if (!open) setFilterView('main');
  };

  const activeGroup = filterGroups.find((g) => g.key === filterView);
  const visibleActions = actions.filter((a) => a.show !== false);

  // Resolve effective width/alignment:
  // - Explicit 'full' or showSearch (no align given) → full width
  // - Explicit 'right' → shrink to content + push right via ml-auto
  // - Explicit 'left' or fallback → shrink to content, left-aligned
  const isFullWidth = align === 'full' || (!align && showSearch);
  const isRightAligned = align === 'right';

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center gap-2 bg-white p-2 border-light-gray border-1 dark:dark-theme-color',
          isFullWidth ? 'w-full' : 'w-auto',
          isRightAligned && 'ml-auto',
          className,
        )}
      >

        {/* ── Search: always visible, stretches to fill available space ───── */}
        {showSearch && (
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="h-9 w-full pl-9"
            />
          </div>
        )}

        {/* ── Status filter slot (e.g. dropdown replacing metric tabs) ───── */}
        {statusSlot}

        {/* ── Filter button ────────────────────────────────────────────────── */}
        {showFilter && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Popover open={isFilterOpen} onOpenChange={handleFilterOpenChange}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'relative shrink-0 gap-1.5',
                      isFilterOpen && 'bg-accent',
                    )}
                    aria-label="Open filters"
                  >
                    <Filter className="h-4 w-4 text-gray-500 dark:text-white" />
                    {/* <span className="hidden sm:inline">{filterLabel}</span> */}
                    {activeFilterCount > 0 && (
                      <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#4eacff] text-[10px] font-bold text-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-80 p-0" align="end">
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  {filterView !== 'main' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 border-light-gray"
                      onClick={() => setFilterView('main')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <span className="primary-text-medium">
                    {filterView === 'main'
                      ? 'Filters'
                      : activeGroup?.label ?? 'Filter'}
                  </span>
                </div>
                <button
                  className="text-muted-foreground hover:text-foreground text-xs underline"
                  onClick={() => {
                    onClearFilters?.();
                    filterGroups.forEach((g) => g.onSelect(''));
                  }}
                >
                  Clear all
                </button>
              </div>

              {/* Body */}
              <div className="p-2">
                {/* Main view */}
                {filterView === 'main' && filterGroups.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {filterGroups.map((group) => (
                      <button
                        key={group.key}
                        className="hover:bg-muted/50 flex w-full items-center justify-between rounded-md p-3 text-left text-sm font-medium transition-colors"
                        onClick={() => setFilterView(group.key)}
                      >
                        <div className="flex flex-col gap-1">
                          <span>{group.label}</span>
                          <span className="text-muted-foreground primary-text-medium">
                            {group.selectedLabel ?? 'All'}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Sub-view */}
                {filterView !== 'main' && activeGroup && (
                  <div className="flex flex-col gap-1 p-1">
                    {activeGroup.options.map((option) => {
                      const isSelected =
                        activeGroup.selectedValue === option.value;
                      return (
                        <div
                          key={option.value}
                          className="hover:bg-muted/80 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
                          onClick={() =>
                            activeGroup.onSelect(
                              isSelected ? '' : option.value,
                            )
                          }
                        >
                          <div
                            className={cn(
                              'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                              isSelected
                                ? 'border-black bg-transparent dark:border-white'
                                : 'border-black/20 bg-transparent dark:border-white/30',
                            )}
                          >
                            {isSelected && (
                              <div className="h-2 w-2 rounded-full bg-black dark:bg-white" />
                            )}
                          </div>
                          {option.color && (
                            <div
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: option.color }}
                            />
                          )}
                          <span className="truncate primary-text-medium dark:text-white">
                            {option.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty state */}
                {filterView === 'main' && filterGroups.length === 0 && (
                  <p className="text-muted-foreground px-3 py-4 text-center primary-text-medium">
                    No filters available.
                  </p>
                )}
              </div>
              </PopoverContent>
              </Popover>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span>Filters</span>
            </TooltipContent>
          </Tooltip>
        )}

        {/* ── Action buttons ───────────────────────────────────────────────── */}
        {visibleActions.map((action) => {
          const Icon = action.icon;
          const isIconOnly = action.variant === 'icon';
          const btnVariant = action.buttonVariant ?? 'outline';

          return (
            <Tooltip key={action.key}>
              <TooltipTrigger asChild>
                <Button
                  onClick={action.onClick}
                  variant={btnVariant}
                  size={isIconOnly ? 'icon' : 'default'}
                  className={cn(
                    'shrink-0',
                    !isIconOnly && 'gap-1.5',
                    action.pillClassName,
                    action.className,
                    'primary-text-medium dark:text-white',
                    'h-9'
                  )}
                  aria-label={action.label}
                >
                  <Icon className="h-4 w-4" />
                  {/* {!isIconOnly && (
                    <span className="hidden sm:inline">{action.label}</span>
                  )} */}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span>{action.label}</span>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* ── Column visibility slot ───────────────────────────────────────── */}
        {columnVisibilitySlot}
      </div>
    </TooltipProvider>
  );
};
