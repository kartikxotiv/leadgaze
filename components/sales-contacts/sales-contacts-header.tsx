"use client";

import { Button } from "@/components/ui/button";
import { Plus, Download, Upload } from "lucide-react";
import { DateRangeFilter } from "@/components/common/date-range-filter";
import { ColumnCustomizer } from "@/components/common/column-customizer";
import { SearchBar } from "@/components/reuseableComponent/search-bar";
import type { DateRange } from "@/components/common/date-range-filter";
import type { ColumnDefinition } from "@/components/common/column-customizer";

export interface SalesContactsHeaderProps {
  dateRange: DateRange | null;
  onDateRangeChange: (range: DateRange | null) => void;
  onDateRangeClear: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
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
  searchTerm,
  onSearchChange,
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <SearchBar
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Search contacts by name, email, phone..."
            className="flex-1 max-w-md"
          />
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
    </div>
  );
}
