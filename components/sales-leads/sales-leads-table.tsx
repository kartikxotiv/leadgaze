"use client";

import { ReactTable } from "@/components/reuseableComponent/ReactTable";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

export interface SalesLeadsTableProps {
  workspaceId?: string;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  tableData: any[];
  columns: any[];
  totalRows: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number, page: number) => void;
  onRowClick: (row: any) => void;
  canViewSalesLeads: boolean;
  isSalesLeadsVisible: boolean;
  permissionsData?: any;
}

export function SalesLeadsTable({
  workspaceId,
  isLoading,
  isError,
  error,
  tableData,
  columns,
  totalRows,
  pageSize,
  currentPage,
  onPageChange,
  onRowsPerPageChange,
  onRowClick,
  canViewSalesLeads,
  isSalesLeadsVisible,
  permissionsData,
}: SalesLeadsTableProps) {
  if (!workspaceId) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-sm text-muted-foreground">
        Select a workspace to view sales leads.
      </div>
    );
  }

  if (permissionsData && !canViewSalesLeads && !isSalesLeadsVisible) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-sm text-muted-foreground text-center">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
        <p>You don't have permission to view sales leads in this workspace.</p>
        <p className="text-xs mt-1">
          Contact your workspace administrator to grant access.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-[420px] w-full" />;
  }

  if (isError) {
    const message =
      error instanceof Error ? error.message : "Something went wrong.";
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load sales leads. {message}
      </div>
    );
  }

  if (tableData.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        No sales leads yet. Add your first lead to get started.
      </div>
    );
  }

  return (
    <ReactTable
      columns={columns}
      data={tableData}
      pagination
      paginationTotalRows={totalRows}
      paginationPerPage={pageSize}
      paginationDefaultPage={currentPage}
      onChangePage={onPageChange}
      onChangeRowsPerPage={onRowsPerPageChange}
      onRowClicked={onRowClick}
    />
  );
}
