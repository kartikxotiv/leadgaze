'use client';

import * as React from 'react';

import { CheckSquare, Download, FileDown, Loader2 } from 'lucide-react';

import { cn } from '../lib/utils';
import { Button } from './button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './tooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CsvExportButtonProps {
  /** Number of currently selected rows (drives badge + enables "Export Selected") */
  selectedCount: number;
  /** Called when the user clicks "Export All" */
  onExportAll: () => void | Promise<void>;
  /** Called when the user clicks "Export Selected" */
  onExportSelected: () => void | Promise<void>;
  /** Whether the export is currently in progress (shows spinner) */
  isExporting?: boolean;
  /** Optionally hide/disable the button entirely (e.g. when there is no data) */
  disabled?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Reusable "Export" toolbar button.
 *
 * Opens a small popover with two options:
 *  1. Export All   — always enabled
 *  2. Export Selected — disabled when selectedCount === 0
 *
 * Place this component inside a `ListToolBar` via its `exportSlot` prop.
 */
export const CsvExportButton: React.FC<CsvExportButtonProps> = ({
  selectedCount,
  onExportAll,
  onExportSelected,
  isExporting = false,
  disabled = false,
  className,
}) => {
  const [open, setOpen] = React.useState(false);

  const handleExportAll = async () => {
    setOpen(false);
    await onExportAll();
  };

  const handleExportSelected = async () => {
    if (selectedCount === 0) return;
    setOpen(false);
    await onExportSelected();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip open={open ? false : undefined}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled || isExporting}
              className={cn(
                'relative h-9 shrink-0 gap-1.5 primary-text-medium dark:text-white',
                className,
              )}
              aria-label="Export data"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 border-light-gray primary-text-medium text-leadgaze-dark dark:text-white" />
              )}

              {/* Selected-count badge — shown when rows are selected */}
              {selectedCount > 0 && !isExporting && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#4eacff] text-[10px] font-bold text-white">
                  {selectedCount > 99 ? '99+' : selectedCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span>Export</span>
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        className="w-52 p-1"
        align="end"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Export All */}
        <button
          className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={handleExportAll}
        >
          <Download className="h-4 w-4 border-light-gray primary-text-medium text-leadgaze-dark dark:text-white" />
          <span className="font-medium">Export All</span>
        </button>

        {/* Export Selected */}
        <button
          className={cn(
            'flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-sm',
            selectedCount > 0
              ? 'hover:bg-gray-100 dark:hover:bg-gray-800'
              : 'cursor-not-allowed opacity-40',
          )}
          onClick={handleExportSelected}
          disabled={selectedCount === 0}
          title={
            selectedCount === 0
              ? 'Select rows in the table first'
              : `Export ${selectedCount} selected row${selectedCount > 1 ? 's' : ''}`
          }
        >
          <CheckSquare className="h-4 w-4 border-light-gray primary-text-medium text-leadgaze-dark dark:text-white" />
          <span className="font-medium">
            Export Selected
            {selectedCount > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#4eacff] px-1 text-[10px] font-bold text-white">
                {selectedCount}
              </span>
            )}
          </span>
        </button>
      </PopoverContent>
    </Popover>
  );
};
