"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutGrid } from "lucide-react";

export interface ColumnDefinition {
  id: string;
  label: string;
}

export interface ColumnCustomizerProps {
  columns: ColumnDefinition[];
  visibleColumns: string[];
  onToggleColumn: (columnId: string) => void;
  onApply: () => void;
  alwaysVisibleColumns?: string[]; // Columns that should always be visible (e.g., 'actions', 'full name')
}

export function ColumnCustomizer({
  columns,
  visibleColumns,
  onToggleColumn,
  onApply,
  alwaysVisibleColumns = [],
}: ColumnCustomizerProps) {
  // Filter out always visible columns from the list
  const toggleableColumns = columns.filter(
    (col) => !alwaysVisibleColumns.includes(col.id)
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="flex items-center gap-2 !font-regular text-xs"
        >
          <LayoutGrid className="!h-4 !w-4" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-64 p-2">
        <p className="text-sm font-semibold px-2 pb-2">Customize Columns</p>
        <div className="flex flex-col gap-2">
          {toggleableColumns.map((col) => (
            <div
              key={col.id}
              className="flex items-center justify-between px-2 py-1 hover:bg-accent rounded"
            >
              <span className="text-sm">{col.label}</span>
              <Switch
                checked={visibleColumns.includes(col.id)}
                onCheckedChange={() => onToggleColumn(col.id)}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-2">
          <Button size="sm" onClick={onApply}>
            Apply
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
