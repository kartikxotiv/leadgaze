"use client";

import { Button } from "@/components/ui/button";
import { Plus, Download, Upload } from "lucide-react";
import { ColumnCustomizer } from "@/components/common/column-customizer";
import type { ColumnDefinition } from "@/components/common/column-customizer";

export interface SalesLeadsHeaderProps {
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
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Sales Leads</h1>
        <p className="text-sm text-muted-foreground">
          Manage your sales pipeline
        </p>
      </div>
      <div className="flex items-center gap-3">
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
  );
}
