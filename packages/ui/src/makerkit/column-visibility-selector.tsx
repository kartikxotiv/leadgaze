'use client';

import React from 'react';

import { Settings2 } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';

import { Button } from '../shadcn/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../shadcn/dropdown-menu';

interface Column {
  id: string;
  label: string;
  required?: boolean;
}

interface ColumnVisibilitySelectorProps {
  columns: Column[];
  visibility: Record<string, boolean>;
  onToggle: (columnId: string) => void;
  onReset?: () => void;
}

export function ColumnVisibilitySelector({
  columns,
  visibility,
  onToggle,
  onReset,
}: ColumnVisibilitySelectorProps) {
  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                <Settings2 className="h-4 w-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>

          <TooltipContent side="bottom">
            <span>Columns</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-[220px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Toggle Columns</span>
          {onReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                onReset();
              }}
              className="h-auto p-0 text-[11px] font-normal hover:bg-transparent hover:underline"
            >
              Reset
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {columns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={visibility[column.id] !== false}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => onToggle(column.id)}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span>{column.label}</span>
              </div>
            </DropdownMenuCheckboxItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
