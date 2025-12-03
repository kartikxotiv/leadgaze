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

// API function to fetch accounts
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
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

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
          <div className="flex items-center gap-3"></div>
        </div>

        {/* Content */}
        {isLoadingAccounts ? (
          <div className="grid gap-4 ">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[300px] w-full" />
            ))}
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
        ) : viewMode === "cards" ? (
          <>
            {/* Cards View */}
            <div className="grid gap-4 ">
              {accounts.map((account: any) => {
                return (
                  <Link key={account.id} href={`/pages/account/${account.id}`}>
                    <Card
                      key={account.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer w-[70%]"
                    >
                      <CardHeader className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-1">
                              {`${account.first_name || ""} ${
                                account.last_name || ""
                              }`.trim() || "Unnamed Account"}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Badge className="bg-emerald-100 text-emerald-700">
                                Account
                              </Badge>
                              {account.business_name && (
                                <Badge
                                  variant="outline"
                                  className="flex items-center gap-1"
                                >
                                  <Building2 className="h-3 w-3" />
                                  {account.business_name}
                                </Badge>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3 p-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-1">
                            {account.email && (
                              <div className="flex items-center gap-2 text-xs mb-2">
                                <span className="font-semibold text-muted-foreground">
                                  Email:
                                </span>
                                &nbsp;
                                <span className="text-muted-foreground truncate">
                                  {account.email}
                                </span>
                              </div>
                            )}
                            {account.phone_number && (
                              <div className="flex items-center gap-2 text-xs mb-2">
                                <span className="font-semibold text-muted-foreground">
                                  Phone:
                                </span>
                                &nbsp;
                                <span className="text-muted-foreground">
                                  {String(account.phone_number)}
                                </span>
                              </div>
                            )}
                            {account.location && (
                              <div className="flex items-center gap-2 text-xs mb-2">
                                <span className="font-semibold text-muted-foreground">
                                  Location:
                                </span>
                                &nbsp;
                                <span className="text-muted-foreground ">
                                  {account.location}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="col-span-1">
                            {(account.alternative_email ||
                              account.alternative_phone_number ||
                              account.linkedin_url) && (
                              <>
                                <div className="text-xs text-muted-foreground">
                                  {account.alternative_email && (
                                    <div className="mb-2">
                                      <span className="font-semibold">
                                        {" "}
                                        Alt Email:
                                      </span>
                                      &nbsp;
                                      {account.alternative_email}
                                    </div>
                                  )}
                                  {account.alternative_phone_number && (
                                    <div className="mb-2">
                                      <span className="font-semibold">
                                        {" "}
                                        Alt Phone:
                                      </span>
                                      &nbsp;
                                      <span className="text-muted-foreground">
                                        {account.alternative_phone_number}
                                      </span>
                                    </div>
                                  )}
                                  {account.linkedin_url && (
                                    <div className="flex items-center gap-1 mb-2">
                                      <span className="font-semibold">
                                        {" "}
                                        LinkedIn:
                                      </span>
                                      &nbsp;
                                      {/* <ExternalLink className="h-3 w-3" /> */}
                                      <a
                                        href={account.linkedin_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline truncate"
                                      >
                                        Personal LinkedIn
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                            <div className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              <span className="font-semibold">Comment:</span>
                              &nbsp;
                              {account.comment}
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                              <div className="flex items-center gap-1">
                                {/* <Calendar className="h-3 w-3" /> */}
                                <span>
                                  <span className="font-semibold">
                                    Converted:
                                  </span>
                                  &nbsp;
                                  {account.converted_at
                                    ? formatDateTimeWithTime(
                                        account.converted_at
                                      )
                                    : "recently"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="col-span-1">
                            {(account.business_name ||
                              account.business_linkedin ||
                              account.business_contact) && (
                              <>
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-muted-foreground uppercase">
                                    Business Details
                                  </div>
                                  {account.business_name && (
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                      <Building2 className="h-4 w-4 text-muted-foreground" />
                                      <span>{account.business_name}</span>
                                    </div>
                                  )}
                                  {account.business_contact && (
                                    <div className="text-sm text-muted-foreground">
                                      Contact: {account.business_contact}
                                    </div>
                                  )}

                                  {account.business_linkedin && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                      <a
                                        href={account.business_linkedin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline truncate"
                                      >
                                        Business LinkedIn
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {/* Pagination for Cards */}
            {totalAccounts > pageSize && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1} to{" "}
                  {Math.min(page * pageSize, totalAccounts)} of {totalAccounts}{" "}
                  accounts
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page * pageSize >= totalAccounts}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">
                Table view coming soon. Please use cards view for now.
              </p>
            </CardContent>
          </Card>
        )}

        <AddBusiness open={addBusinessOpen} onOpenChange={setAddBusinessOpen} />
      </div>
    </DashboardLayout>
  );
}
