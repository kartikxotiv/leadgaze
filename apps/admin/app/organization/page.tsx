'use client';

import React, { useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import {
  Download,
  Edit,
  ExternalLink,
  FileDown,
  FileUp,
  MoreVertical,
  Plus,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@kit/ui/app-shell';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
import { ColumnHeader } from '@kit/ui/column-header';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { CsvExportButton } from '@kit/ui/csv-export-button';
import { CustomTableContainer } from '@kit/ui/custom-table-container';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader, PageHeaderActions } from '@kit/ui/page';
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
import { useCsvExport } from '@kit/ui/use-csv-export';
import { useDateRangeFilter } from '@kit/ui/use-date-range-filter';
import { useTableSort } from '@kit/ui/use-table-sort';
import { cn } from '@kit/ui/utils';

import { AdminNavbar } from '~/components/admin-navbar';
import { useDebounce } from '~/lib/hooks/use-debounce';
import {
  getWorkspacesService,
  WorkspaceItem,
} from '~/services/workspaces.service';

export interface WorkspaceRecord extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  domain: string;
  owner_email: string;
  plan: 'Enterprise' | 'Pro' | 'Starter' | 'Trial';
  status: 'Active' | 'Trial' | 'Suspended' | 'Cancelled';
  members_count: number;
  mrr: string;
  created_at: string;
}

const SYSTEM_FIELDS: Array<{
  id: string;
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}> = [
  { id: 'sno', key: 'sno', label: 'S. No.', sortable: false, width: 'w-12' },
  { id: 'name', key: 'name', label: 'Workspace Name', sortable: true },
  { id: 'domain', key: 'domain', label: 'Domain / URL', sortable: true },
  { id: 'owner_email', key: 'owner_email', label: 'Owner Email', sortable: true },
  { id: 'plan', key: 'plan', label: 'Plan', sortable: true },
  { id: 'members_count', key: 'members_count', label: 'Members', sortable: true },
  { id: 'mrr', key: 'mrr', label: 'MRR', sortable: true },
  { id: 'status', key: 'status', label: 'Status', sortable: true },
  { id: 'created_at', key: 'created_at', label: 'Created On', sortable: true },
];

const DEFAULT_VISIBILITY: Record<string, boolean> = {
  sno: true,
  name: true,
  domain: true,
  owner_email: true,
  plan: true,
  members_count: true,
  mrr: true,
  status: true,
  created_at: true,
};

const EXPORT_COLUMNS = [
  { key: 'name', label: 'Workspace Name' },
  { key: 'slug', label: 'Slug' },
  { key: 'domain', label: 'Domain' },
  { key: 'owner_email', label: 'Owner Email' },
  { key: 'plan', label: 'Plan Tier' },
  { key: 'members_count', label: 'Total Members' },
  { key: 'mrr', label: 'MRR' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created On' },
];

export default function AdminWorkspacesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<Set<string>>(
    new Set(),
  );
  const [isExporting, setIsExporting] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const { dateRange, setDateRange, computedDates } = useDateRangeFilter();

  const { visibility, toggleVisibility, isVisible, reset } = useColumnVisibility(
    'workspaces',
    DEFAULT_VISIBILITY,
  );

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('workspaces');

  const { sortColumn, sortDirection, toggleSort } =
    useTableSort<WorkspaceRecord>('workspaces', [], {
      mode: 'server',
      defaultSortColumn: 'created_at',
      defaultSortDirection: 'desc',
    });

  const columns = useMemo(
    () =>
      SYSTEM_FIELDS.map((f) => ({
        id: f.id,
        label: f.label,
        required: f.id === 'sno' || f.id === 'name',
      })),
    [],
  );

  // Fetch workspaces via TanStack Query
  const {
    data: workspacesData = { data: [], count: 0 },
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      'admin-workspaces',
      currentPage,
      pageSize,
      debouncedSearchTerm,
      selectedPlans,
      selectedStatuses,
      sortColumn,
      sortDirection,
      computedDates,
    ],
    queryFn: () =>
      getWorkspacesService({
        page: currentPage,
        limit: pageSize,
        searchTerm: debouncedSearchTerm,
        plan: selectedPlans,
        status: selectedStatuses,
        sortColumn: sortColumn ?? undefined,
        sortDirection: sortDirection ?? undefined,
        createdAtFrom: computedDates?.from ?? undefined,
        createdAtTo: computedDates?.to ?? undefined,
      }),
  });

  const workspaces = (workspacesData.data || []) as WorkspaceRecord[];
  const totalCount = workspacesData.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Row selection logic
  const allVisibleIds = workspaces.map((ws) => ws.id);
  const isAllSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedWorkspaceIds.has(id));
  const isIndeterminate =
    !isAllSelected && allVisibleIds.some((id) => selectedWorkspaceIds.has(id));

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedWorkspaceIds((prev) => {
        const next = new Set(prev);
        allVisibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedWorkspaceIds((prev) => {
        const next = new Set(prev);
        allVisibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [isAllSelected, allVisibleIds]);

  const handleSelectRow = useCallback((id: string) => {
    setSelectedWorkspaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // CSV Export logic
  const [exportTargetRows, setExportTargetRows] = useState<WorkspaceRecord[]>([]);

  const serializeWorkspaceRow = useCallback((ws: WorkspaceRecord) => {
    return {
      name: ws.name,
      slug: ws.slug,
      domain: ws.domain,
      owner_email: ws.owner_email,
      plan: ws.plan,
      members_count: String(ws.members_count),
      mrr: ws.mrr,
      status: ws.status,
      created_at: ws.created_at,
    };
  }, []);

  const { exportToCsv: triggerExport } = useCsvExport<WorkspaceRecord>({
    filename: 'workspaces_export',
    columns: EXPORT_COLUMNS,
    getRows: () => exportTargetRows,
    serializeRow: serializeWorkspaceRow,
  });

  const handleExportSelected = useCallback(async () => {
    const selectedRows = workspaces.filter((ws) =>
      selectedWorkspaceIds.has(ws.id),
    );
    if (selectedRows.length === 0) {
      toast.info('No workspaces selected for export');
      return;
    }
    setIsExporting(true);
    setExportTargetRows(selectedRows);
    setTimeout(async () => {
      await triggerExport();
      setIsExporting(false);
      toast.success(`Exported ${selectedRows.length} workspaces`);
    }, 50);
  }, [workspaces, selectedWorkspaceIds, triggerExport]);

  const handleExportAll = useCallback(async () => {
    if (workspaces.length === 0) {
      toast.info('No workspaces available to export');
      return;
    }
    setIsExporting(true);
    setExportTargetRows(workspaces);
    setTimeout(async () => {
      await triggerExport();
      setIsExporting(false);
      toast.success(`Exported ${workspaces.length} workspaces`);
    }, 50);
  }, [workspaces, triggerExport]);

  const activeFilterCount =
    (selectedPlans.length > 0 ? 1 : 0) +
    (selectedStatuses.length > 0 ? 1 : 0) +
    (dateRange ? 1 : 0);

  const trailingColumnCount = 2; // +1 for checkbox, +1 for actions

  return (
    <AppShell navbar={<AdminNavbar />}>
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden">
        <PageHeader
          title="Organization"
        >
          <div className="flex items-center gap-2">
            <ColumnVisibilitySelector
              columns={columns}
              visibility={visibility}
              onToggle={toggleVisibility}
              onReset={reset}
            />
            <Button variant="default" className="gap-2 bg-leadgaze-primary hover:bg-leadgaze-primary/90 text-white">
              <Plus className="h-4 w-4" />
              <span>New Organization</span>
            </Button>
          </div>
        </PageHeader>
      </div>

      <div className="flex w-full max-w-full min-w-0 shrink-0 items-center justify-between border-top-bottom-gray">
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
              All Organization
            </span>
            <span className={cn(
              "ml-1 rounded-full px-2 py-0.5 text-xs border",
              selectedStatuses.length === 0 ? "border-blue-200 bg-blue-50 text-leadgaze-primary" : "border-gray-200 bg-gray-50 text-gray-600"
            )}>
              {totalCount}
            </span>
          </button>

          {['Active', 'Trial', 'Suspended'].map((statusLabel) => {
            const isSelected = selectedStatuses.length === 1 && selectedStatuses.includes(statusLabel);
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
                  0
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
          showFilter
          filterGroups={[
            {
              key: 'plan',
              label: 'Plan Tier',
              options: [
                { value: 'Enterprise', label: 'Enterprise' },
                { value: 'Pro', label: 'Pro' },
                { value: 'Starter', label: 'Starter' },
                { value: 'Trial', label: 'Trial' },
              ],
              selectedValues: selectedPlans,
              onSelectValues: setSelectedPlans,
            },
            {
              key: 'created_on',
              label: 'Created On',
              type: 'date',
              dateValue: dateRange,
              onDateChange: setDateRange,
            },
          ]}
          activeFilterCount={activeFilterCount}
          onClearFilters={() => {
            setSelectedPlans([]);
            setSelectedStatuses([]);
            setDateRange(null);
            setSearchTerm('');
          }}
          actions={[
            {
              key: 'import',
              label: 'Import',
              icon: Download,
              onClick: () => {},
              buttonVariant: 'outline',
            },
          ]}
          exportSlot={
            <CsvExportButton
              selectedCount={selectedWorkspaceIds.size}
              onExportSelected={handleExportSelected}
              onExportAll={handleExportAll}
              isExporting={isExporting}
            />
          }
        />
      </div>

      <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col gap-0 pb-0">
          {/* Custom Table Container with Sticky Pagination */}
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
                  entityLabel="workspaces"
                />
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Select All Checkbox */}
                    <TableHead className="w-10 pl-4">
                      <Checkbox
                        checked={isAllSelected || isIndeterminate}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all workspaces"
                      />
                    </TableHead>

                    {/* S. No. */}
                    {isVisible('sno') && (
                      <TableHead {...getHeaderProps('sno')} className="relative w-12 text-center">
                        S. No.
                        <span className="col-resize-handle" {...getResizeHandleProps('sno')} />
                      </TableHead>
                    )}

                    {/* Workspace Name */}
                    {isVisible('name') && (
                      <ColumnHeader
                        columnId="name"
                        label="Workspace Name"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                        className="relative"
                        {...getHeaderProps('name')}
                      >
                        <span className="col-resize-handle" {...getResizeHandleProps('name')} />
                      </ColumnHeader>
                    )}

                    {/* Domain */}
                    {isVisible('domain') && (
                      <ColumnHeader
                        columnId="domain"
                        label="Domain / URL"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                        className="relative"
                        {...getHeaderProps('domain')}
                      >
                        <span className="col-resize-handle" {...getResizeHandleProps('domain')} />
                      </ColumnHeader>
                    )}

                    {/* Owner Email */}
                    {isVisible('owner_email') && (
                      <ColumnHeader
                        columnId="owner_email"
                        label="Owner Email"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                        className="relative"
                        {...getHeaderProps('owner_email')}
                      >
                        <span className="col-resize-handle" {...getResizeHandleProps('owner_email')} />
                      </ColumnHeader>
                    )}

                    {/* Plan */}
                    {isVisible('plan') && (
                      <ColumnHeader
                        columnId="plan"
                        label="Plan Tier"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                        className="relative"
                        {...getHeaderProps('plan')}
                      >
                        <span className="col-resize-handle" {...getResizeHandleProps('plan')} />
                      </ColumnHeader>
                    )}

                    {/* Members */}
                    {isVisible('members_count') && (
                      <ColumnHeader
                        columnId="members_count"
                        label="Members"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                        className="relative"
                        {...getHeaderProps('members_count')}
                      >
                        <span className="col-resize-handle" {...getResizeHandleProps('members_count')} />
                      </ColumnHeader>
                    )}

                    {/* MRR */}
                    {isVisible('mrr') && (
                      <ColumnHeader
                        columnId="mrr"
                        label="MRR"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                        className="relative"
                        {...getHeaderProps('mrr')}
                      >
                        <span className="col-resize-handle" {...getResizeHandleProps('mrr')} />
                      </ColumnHeader>
                    )}

                    {/* Status */}
                    {isVisible('status') && (
                      <ColumnHeader
                        columnId="status"
                        label="Status"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                        className="relative"
                        {...getHeaderProps('status')}
                      >
                        <span className="col-resize-handle" {...getResizeHandleProps('status')} />
                      </ColumnHeader>
                    )}

                    {/* Created Date */}
                    {isVisible('created_at') && (
                      <ColumnHeader
                        columnId="created_at"
                        label="Created On"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                        className="relative"
                        {...getHeaderProps('created_at')}
                      >
                        <span className="col-resize-handle" {...getResizeHandleProps('created_at')} />
                      </ColumnHeader>
                    )}

                    {/* Actions Column */}
                    <TableHead className="sticky-right-header z-10 w-12 px-1 text-center">
                      <Button
                        type="button"
                        size="icon"
                        className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-leadgaze-primary text-white hover:bg-leadgaze-primary/90 border-0 p-0 shadow-xs"
                        title="Add Column"
                      >
                        <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={10} className="p-4">
                          <Skeleton className="h-6 w-full rounded" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : workspaces.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={
                          Object.values(visibility).filter(Boolean).length +
                          trailingColumnCount
                        }
                        className="h-32 text-center text-muted-foreground"
                      >
                        No workspaces found matching your search or filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    workspaces.map((ws, idx) => {
                      const isSelected = selectedWorkspaceIds.has(ws.id);
                      const serialNumber = (currentPage - 1) * pageSize + idx + 1;
                      return (
                        <TableRow
                          key={ws.id}
                          data-state={isSelected ? 'selected' : undefined}
                          className="group cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/organization/${ws.id}`)}
                        >
                          {/* Checkbox */}
                          <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleSelectRow(ws.id)}
                              aria-label={`Select ${ws.name}`}
                            />
                          </TableCell>

                          {/* S. No. */}
                          {isVisible('sno') && (
                            <TableCell className="text-center font-mono text-xs text-muted-foreground">
                              {serialNumber}
                            </TableCell>
                          )}

                          {/* Workspace Name */}
                          {isVisible('name') && (
                            <TableCell className="font-medium text-zinc-900 dark:text-white">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold text-xs flex-shrink-0">
                                  {ws.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm hover:underline cursor-pointer">
                                    {ws.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {ws.slug}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                          )}

                          {/* Domain */}
                          {isVisible('domain') && (
                            <TableCell className="text-sm font-mono text-muted-foreground">
                              <a
                                href={`https://${ws.domain}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                {ws.domain}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </TableCell>
                          )}

                          {/* Owner Email */}
                          {isVisible('owner_email') && (
                            <TableCell className="text-sm text-muted-foreground">
                              {ws.owner_email}
                            </TableCell>
                          )}

                          {/* Plan */}
                          {isVisible('plan') && (
                            <TableCell>
                              <Badge variant="outline" className="font-medium">
                                {ws.plan}
                              </Badge>
                            </TableCell>
                          )}

                          {/* Members */}
                          {isVisible('members_count') && (
                            <TableCell className="text-sm font-medium">
                              <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{ws.members_count}</span>
                              </div>
                            </TableCell>
                          )}

                          {/* MRR */}
                          {isVisible('mrr') && (
                            <TableCell className="text-sm font-semibold text-zinc-900 dark:text-white">
                              {ws.mrr}
                            </TableCell>
                          )}

                          {/* Status */}
                          {isVisible('status') && (
                            <TableCell>
                              <Badge
                                className={
                                  ws.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 hover:bg-emerald-50'
                                    : ws.status === 'Trial'
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 hover:bg-amber-50'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400 hover:bg-rose-50'
                                }
                              >
                                {ws.status}
                              </Badge>
                            </TableCell>
                          )}

                          {/* Created Date */}
                          {isVisible('created_at') && (
                            <TableCell className="text-sm text-muted-foreground">
                              {ws.created_at}
                            </TableCell>
                          )}

                          {/* Action Menu */}
                          <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem className="gap-2">
                                  <Edit className="h-3.5 w-3.5" />
                                  Edit Workspace
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2">
                                  <Shield className="h-3.5 w-3.5" />
                                  Manage Permissions
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="gap-2 text-rose-600 focus:text-rose-600">
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Suspend Workspace
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
