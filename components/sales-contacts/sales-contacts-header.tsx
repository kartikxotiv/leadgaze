"use client";

import { Button } from "@/components/ui/button";
import { Plus, Download, Upload } from "lucide-react";
import { DateRangeFilter } from "@/components/common/date-range-filter";
import { ColumnCustomizer } from "@/components/common/column-customizer";
import type { DateRange } from "@/components/common/date-range-filter";
import type { ColumnDefinition } from "@/components/common/column-customizer";

export interface SalesContactsHeaderProps {
  dateRange: DateRange | null;
  onDateRangeChange: (range: DateRange | null) => void;
  onDateRangeClear: () => void;
  onImportClick: () => void;
  onExportClick: () => void;
  canImport: boolean;
  canExport: boolean;
  tableColumnDefinitions: ColumnDefinition[];
  visibleColumns: string[];
  onToggleColumn: (columnId: string) => void;
  onApplyColumns: () => void;
  canCreateSalesContacts: boolean;
  onAddContactClick: () => void;
}

export function SalesContactsHeader({
  dateRange,
  onDateRangeChange,
  onDateRangeClear,
  onImportClick,
  onExportClick,
  canImport,
  canExport,
  tableColumnDefinitions,
  visibleColumns,
  onToggleColumn,
  onApplyColumns,
  canCreateSalesContacts,
  onAddContactClick,
}: SalesContactsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Contacts</h1>
        <p className="text-sm text-muted-foreground">
          Manage your sales contacts
        </p>
      </div>
      <div className="flex items-center gap-3">
        <DateRangeFilter
          value={dateRange}
          onChange={onDateRangeChange}
          onClear={onDateRangeClear}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onImportClick}
          disabled={!canImport}
        >
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExportClick}
          disabled={!canExport}
        >
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <ColumnCustomizer
          columns={tableColumnDefinitions}
          visibleColumns={visibleColumns}
          onToggleColumn={onToggleColumn}
          onApply={onApplyColumns}
          alwaysVisibleColumns={["full name", "actions"]}
        />
        {canCreateSalesContacts && (
          <Button onClick={onAddContactClick}>
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
        )}
      </div>
    </div>
  );
}
