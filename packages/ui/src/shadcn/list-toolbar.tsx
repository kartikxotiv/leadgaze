'use client';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
  Check,
  ChevronDown,
  Filter,
  Plus,
  Search,
  Trash2,
  X,
  LucideIcon,
} from 'lucide-react';

import { cn } from '../lib/utils';
import { Button } from './button';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from './popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';
import { DateRangePickerPanel } from './date-range-picker-panel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

export interface DateRangeValue {
  preset: 'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'this_year' | 'custom' | null;
  from: string | null;
  to: string | null;
}

export interface FilterGroup {
  key: string;
  label: string;
  type?: 'options' | 'date';
  
  // Options fields
  selectedValue?: string;
  options?: FilterOption[];
  onSelect?: (value: string) => void;
  selectedLabel?: string;
  selectedValues?: string[];
  onSelectValues?: (values: string[]) => void;

  // Date fields
  dateValue?: DateRangeValue | null;
  onDateChange?: (value: DateRangeValue | null) => void;
  dateLabel?: string;
}

export interface ToolbarAction {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  className?: string;
  show?: boolean;
  variant?: 'icon' | 'pill';
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
  pillClassName?: string;
}

export interface ListToolBarProps {
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showFilter?: boolean;
  filterLabel?: string;
  filterGroups?: FilterGroup[];
  activeFilterCount?: number;
  onClearFilters?: () => void;
  actions?: ToolbarAction[];
  columnVisibilitySlot?: React.ReactNode;
  statusSlot?: React.ReactNode;
  align?: 'left' | 'right' | 'full';
  className?: string;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

interface FilterRow {
  id: string;
  filterGroupKey: string;
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
  filterLabel: _filterLabel = 'Show Filters',
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

  // ── Filter rows ──────────────────────────────────────────────────────────
  const [filterRows, setFilterRows] = React.useState<FilterRow[]>([]);
  const [openValueDropdown, setOpenValueDropdown] = React.useState<
    string | null
  >(null);
  const [valueSearchTerm, setValueSearchTerm] = React.useState('');
  const rowIdCounter = React.useRef(0);
  const initialisedRef = React.useRef(false);
  const [dropdownPos, setDropdownPos] = React.useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  React.useEffect(() => {
    if (isFilterOpen && !initialisedRef.current && filterGroups.length > 0) {
      initialisedRef.current = true;
      rowIdCounter.current = 1;
      const firstKey = filterGroups[0]!.key;
      setFilterRows([{ id: 'row-0', filterGroupKey: firstKey }]);
    }
    if (!isFilterOpen) {
      initialisedRef.current = false;
      setOpenValueDropdown(null);
      setValueSearchTerm('');
    }
  }, [isFilterOpen, filterGroups]);

  // No global pointerdown listener — we use a transparent backdrop overlay
  // instead, which avoids interfering with Radix Popover's event handling.

  const addFilterRow = () => {
    rowIdCounter.current++;
    setFilterRows((prev) => [
      ...prev,
      {
        id: `row-${rowIdCounter.current}`,
        filterGroupKey: filterGroups[0]?.key ?? '',
      },
    ]);
  };

  const removeFilterRow = (rowId: string) => {
    const row = filterRows.find((r) => r.id === rowId);
    if (row) {
      clearRowValues(row);
    }
    setFilterRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const updateFilterRowGroup = (rowId: string, groupKey: string) => {
    setFilterRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, filterGroupKey: groupKey } : r,
      ),
    );
    setOpenValueDropdown(null);
  };

  const toggleValue = (row: FilterRow, value: string) => {
    const group = filterGroups.find((g) => g.key === row.filterGroupKey);
    if (!group || group.type === 'date') return;
    if (group.selectedValues && group.onSelectValues) {
      const next = group.selectedValues.includes(value)
        ? group.selectedValues.filter((v) => v !== value)
        : [...group.selectedValues, value];
      group.onSelectValues(next);
    } else if (group.onSelect) {
      const isSelected = group.selectedValue === value;
      group.onSelect(isSelected ? '' : value);
    }
    // Close dropdown on selection based on user requirement
    setOpenValueDropdown(null);
    setDropdownPos(null);
    setValueSearchTerm('');
  };

  const selectAllValues = (row: FilterRow) => {
    const group = filterGroups.find((g) => g.key === row.filterGroupKey);
    if (group?.type === 'date') return;
    if (group?.selectedValues && group.onSelectValues && group.options) {
      group.onSelectValues(group.options.map((o) => o.value));
    }
  };

  const clearRowValues = (row: FilterRow) => {
    const group = filterGroups.find((g) => g.key === row.filterGroupKey);
    if (!group) return;
    if (group.type === 'date') {
      group.onDateChange?.(null);
    } else if (group.selectedValues && group.onSelectValues) {
      group.onSelectValues([]);
    } else if (group.onSelect) {
      group.onSelect('');
    }
  };

  const getGroupForRow = (row: FilterRow) =>
    filterGroups.find((g) => g.key === row.filterGroupKey);

  const getValueTriggerLabel = (group: FilterGroup | undefined): string => {
    if (!group) return 'Select option';
    if (group.type === 'date') {
      if (!group.dateValue) return 'Select date';
      if (group.dateValue.preset === 'custom') {
        const from = group.dateValue.from ? new Date(group.dateValue.from).toLocaleDateString() : '';
        const to = group.dateValue.to ? new Date(group.dateValue.to).toLocaleDateString() : '';
        if (from && to && from !== to) return `${from} - ${to}`;
        return from || to || 'Select date';
      }
      const presets: Record<string, string> = {
        today: 'Today',
        yesterday: 'Yesterday',
        last_7_days: 'Last 7 Days',
        this_month: 'This Month',
        this_year: 'This Year'
      };
      return presets[group.dateValue.preset || ''] || 'Select date';
    }

    if (group.selectedValues && group.options) {
      if (group.selectedValues.length === 0) return 'Select option';
      if (group.selectedValues.length === 1) {
        const opt = group.options.find(
          (o) => o.value === group.selectedValues![0],
        );
        return opt?.label ?? '1 selected';
      }
      return `${group.selectedValues.length} selected`;
    }
    if (group.selectedValue && group.options) {
      const opt = group.options.find((o) => o.value === group.selectedValue);
      return opt?.label ?? '1 selected';
    }
    return 'Select option';
  };

  const handleFilterOpenChange = (open: boolean) => {
    setIsFilterOpen(open);
    if (!open) {
      setOpenValueDropdown(null);
      setValueSearchTerm('');
    }
  };

  const handleClearAll = () => {
    onClearFilters?.();
    filterGroups.forEach((g) => {
      if (g.type === 'date') {
        g.onDateChange?.(null);
      } else if (g.selectedValues && g.onSelectValues) {
        g.onSelectValues([]);
      } else {
        g.onSelect?.('');
      }
    });
  };

  const visibleActions = actions.filter((a) => a.show !== false);

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
        {/* ── Search ────────────────────────────────────────────────────────── */}
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

        {/* ── Status filter slot ────────────────────────────────────────────── */}
        {statusSlot}

        {/* ── Filter button + popover ──────────────────────────────────────── */}
        {showFilter && (
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
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#4eacff] text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>

            <PopoverContent
              className="w-[460px] p-0 max-h-[420px] overflow-y-auto"
              align="end"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onPointerDownOutside={(e) => {
                const target = e.target as HTMLElement;
                if (
                  target.closest('[data-value-portal]') ||
                  target.closest('[data-value-backdrop]') ||
                  target.closest('[data-filter-portal]')
                ) {
                  e.preventDefault();
                }
              }}
              onInteractOutside={(e) => {
                const target = e.target as HTMLElement;
                if (
                  target.closest('[data-value-portal]') ||
                  target.closest('[data-value-backdrop]') ||
                  target.closest('[data-filter-portal]')
                ) {
                  e.preventDefault();
                }
              }}
            >
              {/* ── Header ──────────────────────────────────────────────── */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3 dark:bg-gray-900">
                <span className="primary-text-medium">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#4eacff] px-1.5 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </div>

              {/* ── Filter rows ───────────────────────────────────────── */}
              <div className="p-2">
                {filterRows.length === 0 && (
                  <p className="text-muted-foreground px-3 py-4 text-center text-sm">
                    No filters added.
                  </p>
                )}

                {filterRows.map((row) => {
                  const group = getGroupForRow(row);
                  const isValueOpen = openValueDropdown === row.id;
                  const triggerLabel = getValueTriggerLabel(group);

                  return (
                    <div key={row.id} className="mb-2">
                      <div className="flex items-center gap-1.5">
                        {/* ── Field selector ──────────────────────────── */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-[130px] shrink-0 justify-between gap-1 text-xs font-medium"
                            >
                              <span className="truncate">
                                {group?.label ?? 'Filter'}
                              </span>
                              <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-48 p-1"
                            align="start"
                            onOpenAutoFocus={(e) => e.preventDefault()}
                            data-filter-portal
                          >
                            {filterGroups.length >= 1 && (
                              <div className="px-1 pb-1">
                                <Input
                                  placeholder="Search…"
                                  className="h-7 w-full text-xs"
                                  onChange={(e) => {
                                    const term = e.target.value.toLowerCase();
                                    const container =
                                      e.currentTarget.closest('[data-filter-portal]');
                                    if (!container) return;
                                    container
                                      .querySelectorAll<HTMLButtonElement>(
                                        '[data-filter-group-option]',
                                      )
                                      .forEach((btn) => {
                                        const label =
                                          btn.getAttribute('data-label') ?? '';
                                        btn.style.display = label
                                          .toLowerCase()
                                          .includes(term)
                                          ? ''
                                          : 'none';
                                      });
                                  }}
                                />
                              </div>
                            )}
                            {filterGroups.map((g) => (
                              <PopoverClose asChild key={g.key}>
                                <button
                                  data-filter-group-option
                                  data-label={g.label}
                                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                                  onClick={() =>
                                    updateFilterRowGroup(row.id, g.key)
                                  }
                                >
                                  {row.filterGroupKey === g.key && (
                                    <Check className="h-3 w-3 shrink-0" />
                                  )}
                                  <span
                                    className={cn(
                                      'truncate primary-text-regular',
                                      row.filterGroupKey !== g.key && 'pl-5',
                                    )}
                                  >
                                    {g.label}
                                  </span>
                                </button>
                              </PopoverClose>
                            ))}
                          </PopoverContent>
                        </Popover>

                        {/* ── Operator ──────────────────────────────── */}
                        <span className="shrink-0 text-xs text-gray-500">
                          Is
                        </span>

                        {/* ── Value selector ────────────────────────── */}
                        <div className="min-w-0 flex-1">
                          <Button
                            variant="outline"
                            size="sm"
                            data-value-trigger={row.id}
                            className={cn(
                              'h-8 w-full justify-between gap-1 text-xs',
                              isValueOpen && 'ring-1 ring-gray-300',
                            )}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isValueOpen) {
                                setOpenValueDropdown(null);
                                setValueSearchTerm('');
                                setDropdownPos(null);
                              } else {
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                setDropdownPos({
                                  top: rect.bottom + 4,
                                  left: rect.left,
                                  width: Math.max(rect.width, 220),
                                });
                                setOpenValueDropdown(row.id);
                                setValueSearchTerm('');
                              }
                            }}
                          >
                            <span className="truncate text-left">
                              {triggerLabel}
                            </span>
                            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                          </Button>
                        </div>

                        {/* ── Clear values ──────────────────────────── */}
                        <button
                          className="shrink-0 rounded p-1 text-gray-400 hover:text-gray-600"
                          onClick={() => clearRowValues(row)}
                          title="Clear"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>

                        {/* ── Remove row ────────────────────────────── */}
                        <button
                          className="shrink-0 rounded p-1 text-gray-400 hover:text-red-500"
                          onClick={() => removeFilterRow(row.id)}
                          title="Remove filter"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Add filter button ──────────────────────────────────── */}
              {filterGroups.length > 0 && (
                <div className="sticky bottom-0 z-10 border-t bg-white p-2 dark:bg-gray-900">
                  <button
                    className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    onClick={addFilterRow}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add filter</span>
                  </button>
                </div>
              )}

              {/* ── Clear all ───────────────────────────────────────────── */}
              {activeFilterCount > 0 && (
                <div className="sticky bottom-0 z-10 border-t bg-white px-4 py-2 dark:bg-gray-900">
                  <button
                    className="text-xs text-gray-500 underline hover:text-gray-700"
                    onClick={handleClearAll}
                  >
                    Clear all
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
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
                    'h-9',
                  )}
                  aria-label={action.label}
                >
                  <Icon className="h-4 w-4" />
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

      {/* ── Portal-rendered value dropdown (escapes PopoverContent overflow) ── */}
      {openValueDropdown && dropdownPos
        ? (() => {
          const activeRow = filterRows.find((r) => r.id === openValueDropdown);
          if (!activeRow) return null;
          const activeGroup = getGroupForRow(activeRow);
          if (!activeGroup) return null;
          const isMulti = !!activeGroup.selectedValues;
          const filtered = (activeGroup.options || []).filter((opt) =>
            opt.label.toLowerCase().includes(valueSearchTerm.toLowerCase()),
          );

          return ReactDOM.createPortal(
            <>
              {/* Transparent backdrop — catches outside clicks to close dropdown */}
              <div
                data-value-backdrop
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 9998,
                }}
                onClick={() => {
                  setOpenValueDropdown(null);
                  setValueSearchTerm('');
                  setDropdownPos(null);
                }}
              />
              {/* Dropdown panel */}
              <div
                data-value-portal
                style={{
                  position: 'fixed',
                  top: dropdownPos.top,
                  left: dropdownPos.left,
                  minWidth: dropdownPos.width,
                  zIndex: 9999,
                }}
                className="rounded-md border bg-white shadow-lg dark:bg-gray-900"
              >
              {/* Search */}
              {activeGroup.type === 'date' ? (
                <DateRangePickerPanel
                  value={activeGroup.dateValue || null}
                  onChange={(val) => {
                    activeGroup.onDateChange?.(val);
                    setOpenValueDropdown(null);
                    setDropdownPos(null);
                  }}
                  onClose={() => {
                    setOpenValueDropdown(null);
                    setDropdownPos(null);
                  }}
                />
              ) : (
                <>
                  <div className="p-2">
                    <input
                      type="text"
                      placeholder="Search…"
                      value={valueSearchTerm}
                      onChange={(e) => setValueSearchTerm(e.target.value)}
                      className="h-7 w-full rounded border border-gray-200 px-2 text-xs outline-none focus:ring-1 focus:ring-gray-300"
                      autoFocus
                    />
                  </div>

                  {/* Select All (multi-select only) */}
                  {isMulti && (
                    <div className="px-2 pb-1">
                      <button
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => selectAllValues(activeRow)}
                      >
                        Select All
                      </button>
                    </div>
                  )}

                  {/* Options list */}
                  <div className="max-h-[200px] overflow-y-auto px-1 pb-1">
                    {filtered.length === 0 && (
                      <p className="px-2 py-3 text-center text-xs text-gray-400">
                        No options
                      </p>
                    )}
                    {filtered.map((opt) => {
                      const isSelected = isMulti
                        ? activeGroup.selectedValues!.includes(opt.value)
                        : activeGroup.selectedValue === opt.value;

                      return (
                        <button
                          key={opt.value}
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={() => toggleValue(activeRow, opt.value)}
                        >
                          {/* Color dot */}
                          {opt.color && (
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: opt.color }}
                            />
                          )}
                          <span className="truncate flex-1">{opt.label}</span>
                          {isSelected && (
                             <Check className="h-4 w-4 text-blue-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            </>,
            document.body,
          );
        })()
        : null}
    </TooltipProvider>
  );
};
