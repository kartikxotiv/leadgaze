'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Eye, MoreVertical, Plus, Trash2 } from 'lucide-react';

import { AppShell } from '@kit/ui/app-shell';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
import { ColumnHeader } from '@kit/ui/column-header';
import { CustomTableContainer } from '@kit/ui/custom-table-container';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Skeleton } from '@kit/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { TablePagination } from '@kit/ui/table-pagination';
import { useColumnResize } from '@kit/ui/use-column-resize';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';
import { useTableSort } from '@kit/ui/use-table-sort';
import { cn } from '@kit/ui/utils';

import { AdminNavbar } from '~/components/admin-navbar';
import { useDebounce } from '~/lib/hooks/use-debounce';
import { getSubscriptionsService, SubscriptionItem } from '~/services/subscriptions.service';

const SYSTEM_FIELDS: Array<{
  id: string;
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}> = [
  { id: 'sno', key: 'sno', label: 'S. No.', sortable: false, width: 'w-12' },
  { id: 'workspace_name', key: 'workspace_name', label: 'Workspace', sortable: true },
  { id: 'plan', key: 'plan', label: 'Plan', sortable: true },
  { id: 'amount', key: 'amount', label: 'Amount', sortable: true },
  { id: 'billing_cycle', key: 'billing_cycle', label: 'Billing Cycle', sortable: true },
  { id: 'status', key: 'status', label: 'Status', sortable: true },
  { id: 'renewal_date', key: 'renewal_date', label: 'Renewal date', sortable: true },
];

const DEFAULT_VISIBILITY: Record<string, boolean> = {
  sno: true,
  workspace_name: true,
  plan: true,
  amount: true,
  billing_cycle: true,
  status: true,
  renewal_date: true,
};

function StatCard({ 
  title, 
  value, 
  subValue, 
  valueColor = "text-leadgaze-primary", 
  subValueColor = "text-muted-foreground" 
}: { 
  title: string, 
  value: string, 
  subValue: string, 
  valueColor?: string, 
  subValueColor?: string 
}) {
  return (
    <div className="bg-white rounded-lg border p-4 shadow-sm flex flex-col justify-between">
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      <div className={cn("text-2xl font-bold mt-2", valueColor)}>{value}</div>
      <div className={cn("text-xs mt-1", subValueColor)}>{subValue}</div>
    </div>
  );
}

export default function AdminSubscriptionsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedSubscriptionIds, setSelectedSubscriptionIds] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const { visibility, isVisible } = useColumnVisibility(
    'subscriptions',
    DEFAULT_VISIBILITY,
  );

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('subscriptions');

  const { sortColumn, sortDirection, toggleSort } =
    useTableSort<SubscriptionItem>('subscriptions', [], {
      mode: 'server',
      defaultSortColumn: 'renewal_date',
      defaultSortDirection: 'desc',
    });

  const {
    data = { data: [], count: 0, metrics: {} as any },
    isLoading,
  } = useQuery({
    queryKey: [
      'admin-subscriptions',
      currentPage,
      pageSize,
      debouncedSearchTerm,
      selectedStatuses,
    ],
    queryFn: () =>
      getSubscriptionsService({
        page: currentPage,
        limit: pageSize,
        searchTerm: debouncedSearchTerm,
        status: selectedStatuses,
      }),
  });

  const subscriptions = (data.data || []) as SubscriptionItem[];
  const metrics = data.metrics || {};
  const totalCount = data.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const allVisibleIds = subscriptions.map((ws) => ws.id);
  const isAllSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedSubscriptionIds.has(id));
  const isIndeterminate = !isAllSelected && allVisibleIds.some((id) => selectedSubscriptionIds.has(id));

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedSubscriptionIds(new Set());
    } else {
      setSelectedSubscriptionIds(new Set(allVisibleIds));
    }
  }, [isAllSelected, allVisibleIds]);

  const handleSelectRow = useCallback((id: string) => {
    setSelectedSubscriptionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <AppShell navbar={<AdminNavbar />}>
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-4 overflow-hidden">
        <PageHeader title="Subscriptions" />
        
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 px-6 pt-2">
          <StatCard 
            title="MRR" 
            value={metrics.mrr || "$0"} 
            subValue={metrics.mrr_trend || ""} 
            valueColor="text-emerald-500"
            subValueColor={metrics.mrr_trend_positive !== false ? "text-emerald-500" : "text-rose-500"} 
          />
          <StatCard 
            title="ARR" 
            value={metrics.arr || "$0"} 
            valueColor="text-leadgaze-primary"
            subValue={metrics.arr_trend || ""} 
          />
          <StatCard 
            title="Avg Rev / Workspace" 
            value={metrics.avg_rev_per_workspace || "$0"} 
            valueColor="text-leadgaze-primary"
            subValue={metrics.avg_rev_trend || ""} 
          />
          <StatCard 
            title="LTV" 
            value={metrics.ltv || "$0"} 
            valueColor="text-amber-500"
            subValue={metrics.ltv_trend || ""} 
          />
          <StatCard 
            title="Churn Rate" 
            value={metrics.churn_rate || "0%"} 
            valueColor="text-rose-500" 
            subValue={metrics.churn_trend || ""} 
            subValueColor={metrics.churn_trend_positive !== false ? "text-emerald-500" : "text-rose-500"}
          />
        </div>
      </div>

      <div className="flex w-full max-w-full min-w-0 shrink-0 items-center justify-between border-top-bottom-gray mt-4">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => {
              setSelectedStatuses([]);
              setCurrentPage(1);
            }}
            className={cn(
              "flex items-center gap-1 whitespace-nowrap border-b-2 px-3 py-1 primary-text-medium",
              selectedStatuses.length === 0
                ? "border-leadgaze-primary text-leadgaze-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <span className="flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              All Subscriptions
            </span>
            <span className={cn(
              "ml-1 rounded-full px-2 py-0.5 text-xs border",
              selectedStatuses.length === 0 ? "border-blue-200 bg-blue-50 text-leadgaze-primary" : "border-gray-200 bg-gray-50 text-gray-600"
            )}>
              {metrics.counts?.all || 0}
            </span>
          </button>

          {['Failed Payment', 'Trial', 'Enterprise'].map((statusLabel) => {
            const isSelected = selectedStatuses.length === 1 && selectedStatuses.includes(statusLabel);
            let countForTab = 0;
            if (statusLabel === 'Failed Payment') countForTab = metrics.counts?.failed_payment || 0;
            if (statusLabel === 'Trial') countForTab = metrics.counts?.trial || 0;
            if (statusLabel === 'Enterprise') countForTab = metrics.counts?.enterprise || 0;
            
            return (
              <button
                key={statusLabel}
                onClick={() => {
                  setSelectedStatuses([statusLabel]);
                  setCurrentPage(1);
                }}
                className={cn(
                  "flex items-center gap-1 whitespace-nowrap border-b-2 px-3 py-1 primary-text-regular",
                  isSelected
                    ? "border-leadgaze-primary text-leadgaze-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}
              >
                {statusLabel}
                <span className={cn(
                  "ml-1 rounded-full px-2 py-0.5 text-xs border",
                  isSelected ? "border-blue-200 bg-blue-50 text-leadgaze-primary" : "border-gray-200 bg-gray-50 text-gray-600"
                )}>
                  {countForTab}
                </span>
              </button>
            );
          })}
        </div>

        <ListToolBar
          align="right"
          className="border-none bg-transparent p-0"
          showSearch
          expandableSearch
          searchPlaceholder="Search"
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>

      <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col gap-0 pb-0">
          <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 gap-0">
            <CustomTableContainer
              pagination={
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  entityLabel="entries"
                />
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 pl-4">
                      <Checkbox
                        checked={
                          isAllSelected
                            ? true
                            : isIndeterminate
                              ? 'indeterminate'
                              : false
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>

                    {isVisible('sno') && (
                      <TableHead {...getHeaderProps('sno')} className="relative w-12 text-center">
                        S. No.
                        <span className="col-resize-handle" {...getResizeHandleProps('sno')} />
                      </TableHead>
                    )}

                    {isVisible('workspace_name') && (
                      <ColumnHeader columnId="workspace_name" label="Workspace" sortColumn={sortColumn} sortDirection={sortDirection} onSort={toggleSort} className="relative" {...getHeaderProps('workspace_name')}>
                        <span className="col-resize-handle" {...getResizeHandleProps('workspace_name')} />
                      </ColumnHeader>
                    )}

                    {isVisible('plan') && (
                      <ColumnHeader columnId="plan" label="Plan" sortColumn={sortColumn} sortDirection={sortDirection} onSort={toggleSort} className="relative" {...getHeaderProps('plan')}>
                        <span className="col-resize-handle" {...getResizeHandleProps('plan')} />
                      </ColumnHeader>
                    )}

                    {isVisible('amount') && (
                      <ColumnHeader columnId="amount" label="Amount" sortColumn={sortColumn} sortDirection={sortDirection} onSort={toggleSort} className="relative" {...getHeaderProps('amount')}>
                        <span className="col-resize-handle" {...getResizeHandleProps('amount')} />
                      </ColumnHeader>
                    )}

                    {isVisible('billing_cycle') && (
                      <ColumnHeader columnId="billing_cycle" label="Billing Cycle" sortColumn={sortColumn} sortDirection={sortDirection} onSort={toggleSort} className="relative" {...getHeaderProps('billing_cycle')}>
                        <span className="col-resize-handle" {...getResizeHandleProps('billing_cycle')} />
                      </ColumnHeader>
                    )}

                    {isVisible('status') && (
                      <ColumnHeader columnId="status" label="Status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={toggleSort} className="relative" {...getHeaderProps('status')}>
                        <span className="col-resize-handle" {...getResizeHandleProps('status')} />
                      </ColumnHeader>
                    )}

                    {isVisible('renewal_date') && (
                      <ColumnHeader columnId="renewal_date" label="Renewal date" sortColumn={sortColumn} sortDirection={sortDirection} onSort={toggleSort} className="relative" {...getHeaderProps('renewal_date')}>
                        <span className="col-resize-handle" {...getResizeHandleProps('renewal_date')} />
                      </ColumnHeader>
                    )}

                    <TableHead className="sticky-right-header z-10 w-12 px-1 text-center">
                      <Button type="button" size="icon" className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-leadgaze-primary text-white hover:bg-leadgaze-primary/90 border-0 p-0 shadow-xs">
                        <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={9} className="p-4">
                          <Skeleton className="h-6 w-full rounded" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : subscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                        No subscriptions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptions.map((sub, idx) => {
                      const isSelected = selectedSubscriptionIds.has(sub.id);
                      const serialNumber = (currentPage - 1) * pageSize + idx + 1;
                      return (
                        <TableRow key={sub.id} className="group cursor-pointer hover:bg-muted/50">
                          <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={isSelected} onCheckedChange={() => handleSelectRow(sub.id)} />
                          </TableCell>

                          {isVisible('sno') && (
                            <TableCell className="text-center text-muted-foreground">
                              {serialNumber}
                            </TableCell>
                          )}

                          {isVisible('workspace_name') && (
                            <TableCell className="font-medium text-zinc-900 dark:text-white">
                              {sub.workspace_name}
                            </TableCell>
                          )}

                          {isVisible('plan') && (
                            <TableCell>
                              <Badge variant="outline" className={
                                sub.plan === 'Enterprise' ? 'bg-purple-50 text-purple-700 border-purple-200 rounded-full' :
                                sub.plan === 'Growth' ? 'bg-blue-50 text-blue-700 border-blue-200 rounded-full' :
                                'bg-gray-50 text-gray-700 border-gray-200 rounded-full'
                              }>
                                {sub.plan}
                              </Badge>
                            </TableCell>
                          )}

                          {isVisible('amount') && (
                            <TableCell className="text-muted-foreground">
                              {sub.amount}
                            </TableCell>
                          )}

                          {isVisible('billing_cycle') && (
                            <TableCell className="text-muted-foreground">
                              {sub.billing_cycle}
                            </TableCell>
                          )}

                          {isVisible('status') && (
                            <TableCell>
                              <Badge
                                className={
                                  sub.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 hover:bg-emerald-50'
                                    : sub.status === 'Trial'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400 hover:bg-blue-50'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400 hover:bg-rose-50'
                                }
                              >
                                {sub.status}
                              </Badge>
                            </TableCell>
                          )}

                          {isVisible('renewal_date') && (
                            <TableCell className="text-sm text-muted-foreground">
                              {sub.renewal_date}
                            </TableCell>
                          )}

                          <TableCell className="bg-card sticky right-0 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem className="gap-2">
                                  <Eye className="h-3.5 w-3.5" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2">
                                  <Edit className="h-3.5 w-3.5" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="gap-2 text-rose-600 focus:text-rose-600">
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Suspend
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-rose-600 focus:text-rose-600">
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CustomTableContainer>
          </div>
        </div>
      </PageBody>
    </AppShell>
  );
}
