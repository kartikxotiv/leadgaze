"use client";

import React, { useState, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import AddBusiness from "@/components/business/add-business";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Flag,
  ExternalLink,
  User,
  Briefcase,
  Database,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import {
  useWorkspacePermissions,
  useWorkspaceRoutePermission,
} from "@/hooks/use-workspace-permissions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDateTimeWithTime } from "@/lib/utils/sales-lead-utils";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";
import Link from "next/link";
import { ReactTable } from "@/components/reuseableComponent/ReactTable";
import { useRouter } from "next/navigation";
import { useAccountTableColumns } from "@/components/accounts/account-table-columns";
import { ColumnDefinition } from "@/components/common/column-customizer";
import { ColumnCustomizer } from "@/components/common/column-customizer";

async function fetchAccounts(
  workspaceId: string,
  page: number = 1,
  limit: number = 20,
  token?: string
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    workspaceId,
  });

  const response = await fetch(`/api/accounts?${params}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch accounts");
  }

  const data = await response.json();
  return data.success ? data.data : data;
}

export default function AccountPage() {
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceId = currentWorkspace?.id;
  const { user, token } = useAuthStore();
  const [addBusinessOpen, setAddBusinessOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const router = useRouter();

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "email",
    "phone",
    "business",
    "location",
    "alternative_email",
    "alternative_phone",
    "linkedin",
    "comment",
    "business_linkedin",
    "converted_at",
  ]);

  const { data: permissionsData, isLoading: isLoadingPermissions } =
    useWorkspacePermissions();
  const canViewSalesLeads = useWorkspaceRoutePermission("Sales Leads", "view");

  // Fetch accounts from accounts table
  const {
    data: accountsData,
    isLoading: isLoadingAccounts,
    isError: isAccountsError,
    error: accountsError,
  } = useQuery({
    queryKey: ["accounts", workspaceId, page, pageSize],
    queryFn: () =>
      fetchAccounts(workspaceId!, page, pageSize, token || undefined),
    enabled: !!workspaceId,
  });

  const accounts = accountsData?.data || [];
  const totalAccounts = accountsData?.count || 0;

  // Table column definitions for column customizer
  const tableColumnDefinitions: ColumnDefinition[] = useMemo(
    () => [
      { id: "email", label: "Email" },
      { id: "phone", label: "Phone" },
      { id: "business", label: "Business" },
      { id: "location", label: "Location" },
      { id: "alternative_email", label: "Alternative Email" },
      { id: "alternative_phone", label: "Alternative Phone" },
      { id: "linkedin", label: "LinkedIn" },
      { id: "business_linkedin", label: "Business LinkedIn" },
      { id: "business_contact", label: "Business Contact" },
      { id: "comment", label: "Comment" },
      { id: "converted_at", label: "Converted" },
    ],
    []
  );

  // Get table columns using the hook
  const columns = useAccountTableColumns({
    page,
    pageSize,
    visibleColumns,
  });

  const handleRowClick = (row: any) => {
    router.push(`/pages/account/${row.id}`);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleToggleColumn = useCallback((columnId: string) => {
    setVisibleColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  }, []);

  const handleApplyColumns = useCallback(() => {
    // Columns are already updated via handleToggleColumn
    console.log("Applied columns:", visibleColumns);
  }, [visibleColumns]);

  if (isLoadingPermissions && !permissionsData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Accounts</h1>
            <p className="text-sm text-muted-foreground">
              View your won leads converted to accounts
            </p>
          </div>
        </div>
        <div className="mt-6 border border-muted-foreground/30 overflow-hidden">
          <Skeleton className="h-[420px] w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {totalAccounts > 0
                ? `${totalAccounts} ${
                    totalAccounts === 1 ? "account" : "accounts"
                  } from won leads`
                : "View your won leads converted to accounts"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ColumnCustomizer
              columns={tableColumnDefinitions}
              visibleColumns={visibleColumns}
              onToggleColumn={handleToggleColumn}
              onApply={handleApplyColumns}
              alwaysVisibleColumns={["name"]}
            />
          </div>
        </div>

        {isLoadingAccounts ? (
          <div className="border border-muted-foreground/30 overflow-hidden">
            <Skeleton className="h-[420px] w-full" />
          </div>
        ) : isAccountsError ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Error Loading Accounts
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {accountsError?.message ||
                  "Failed to load accounts. Please try again."}
              </p>
            </CardContent>
          </Card>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Accounts Yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                You don't have any accounts yet. Convert a lead to "won" status
                to see it here as an account.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="border border-muted-foreground/30 overflow-hidden">
              <ReactTable
                columns={columns}
                data={accounts}
                pagination={true}
                paginationTotalRows={totalAccounts}
                paginationPerPage={pageSize}
                paginationDefaultPage={page}
                onChangePage={handlePageChange}
                onRowClicked={handleRowClick}
              />
            </div>

            {/* Pagination Info */}
            {totalAccounts > pageSize && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  Showing {(page - 1) * pageSize + 1} to{" "}
                  {Math.min(page * pageSize, totalAccounts)} of {totalAccounts}{" "}
                  accounts
                </div>
              </div>
            )}
          </>
        )}

        <AddBusiness open={addBusinessOpen} onOpenChange={setAddBusinessOpen} />
      </div>
    </DashboardLayout>
  );
}
