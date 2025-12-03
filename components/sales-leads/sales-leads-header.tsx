"use client";

import { Button } from "@/components/ui/button";
import { Plus, Download, Upload } from "lucide-react";
import { DateRangeFilter } from "@/components/common/date-range-filter";
import { ColumnCustomizer } from "@/components/common/column-customizer";
import { SearchBar } from "@/components/reuseableComponent/search-bar";
import type { DateRange } from "@/components/common/date-range-filter";
import type { ColumnDefinition } from "@/components/common/column-customizer";

export interface SalesLeadsHeaderProps {
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
  canCreateSalesLeads: boolean;
  onAddLeadClick: () => void;
}

export function SalesLeadsHeader({
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
  canCreateSalesLeads,
  onAddLeadClick,
}: SalesLeadsHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <SearchBar
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Search leads by name, email, phone..."
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
            alwaysVisibleColumns={["name", "actions"]}
          />
          {canCreateSalesLeads && (
            <Button onClick={onAddLeadClick}>
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          )}
        </div>
      </div>
      {/* <div className="flex items-center gap-3">
        <SearchBar
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Search leads by name, email, phone..."
          className="flex-1 max-w-md"
        />
      </div> */}
    </div>
  );
}
