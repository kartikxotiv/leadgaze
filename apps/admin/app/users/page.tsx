'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import {
  Edit,
  Key,
  Loader2,
  MoreVertical,
  Plus,
  Shield,
  Trash2,
  UserCheck,
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

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';

import { AdminNavbar } from '~/components/admin-navbar';
import { useDebounce } from '~/lib/hooks/use-debounce';
import { startImpersonationService } from '~/services/impersonation.service';
import { getUsersService, UserItem } from '~/services/users.service';

export interface UserRecord extends Record<string, unknown> {
  id: string;
  full_name: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Member' | 'Viewer';
  status: 'Active' | 'Invited' | 'Suspended';
  workspaces_count: number;
  last_login: string;
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
    { id: 'full_name', key: 'full_name', label: 'Full Name', sortable: true },
    { id: 'email', key: 'email', label: 'Email Address', sortable: true },
    { id: 'role', key: 'role', label: 'Role', sortable: true },
    { id: 'status', key: 'status', label: 'Status', sortable: true },
    { id: 'workspaces_count', key: 'workspaces_count', label: 'Workspaces', sortable: true },
    { id: 'last_login', key: 'last_login', label: 'Last Login', sortable: true },
    { id: 'created_at', key: 'created_at', label: 'Joined On', sortable: true },
  ];

const DEFAULT_VISIBILITY: Record<string, boolean> = {
  sno: true,
  full_name: true,
  email: true,
  role: true,
  status: true,
  workspaces_count: true,
  last_login: true,
  created_at: true,
};

const EXPORT_COLUMNS = [
  { key: 'full_name', label: 'Full Name' },
  { key: 'email', label: 'Email Address' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'workspaces_count', label: 'Workspaces Count' },
  { key: 'last_login', label: 'Last Login' },
  { key: 'created_at', label: 'Joined On' },
];

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(),
  );
  const [isExporting, setIsExporting] = useState(false);

  // Impersonation state
  const [impersonateTarget, setImpersonateTarget] = useState<UserRecord | null>(null);
  const [impersonateReason, setImpersonateReason] = useState('');
  const [isImpersonating, setIsImpersonating] = useState(false);
  const impersonateReasonRef = useRef<HTMLTextAreaElement>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const { dateRange, setDateRange, computedDates } = useDateRangeFilter();

  const { visibility, toggleVisibility, isVisible, reset } = useColumnVisibility(
    'users',
    DEFAULT_VISIBILITY,
  );

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('users');

  const { sortColumn, sortDirection, toggleSort } =
    useTableSort<UserRecord>('users', [], {
      mode: 'server',
      defaultSortColumn: 'created_at',
      defaultSortDirection: 'desc',
    });

  const columns = useMemo(
    () =>
      SYSTEM_FIELDS.map((f) => ({
        id: f.id,
        label: f.label,
        required: f.id === 'sno' || f.id === 'full_name',
      })),
    [],
  );

  // Fetch users via TanStack Query
  const {
    data: usersData = { data: [], count: 0 },
    isLoading,
  } = useQuery({
    queryKey: [
      'admin-users',
      currentPage,
      pageSize,
      debouncedSearchTerm,
      selectedRoles,
      selectedStatuses,
      sortColumn,
      sortDirection,
      computedDates,
    ],
    queryFn: () =>
      getUsersService({
        page: currentPage,
        limit: pageSize,
        searchTerm: debouncedSearchTerm,
        role: selectedRoles,
        status: selectedStatuses,
        sortColumn: sortColumn ?? undefined,
        sortDirection: sortDirection ?? undefined,
        createdAtFrom: computedDates?.from ?? undefined,
        createdAtTo: computedDates?.to ?? undefined,
      }),
  });

  const users = (usersData.data || []) as UserRecord[];
  const totalCount = usersData.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Row selection logic
  const allVisibleIds = users.map((u) => u.id);
  const isAllSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedUserIds.has(id));
  const isIndeterminate =
    !isAllSelected && allVisibleIds.some((id) => selectedUserIds.has(id));

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        allVisibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        allVisibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [isAllSelected, allVisibleIds]);

  const handleSelectRow = useCallback((id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // CSV Export logic
  const [exportTargetRows, setExportTargetRows] = useState<UserRecord[]>([]);

  const serializeUserRow = useCallback((u: UserRecord) => {
    return {
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      status: u.status,
      workspaces_count: String(u.workspaces_count),
      last_login: u.last_login,
      created_at: u.created_at,
    };
  }, []);

  const { exportToCsv: triggerExport } = useCsvExport<UserRecord>({
    filename: 'users_export',
    columns: EXPORT_COLUMNS,
    getRows: () => exportTargetRows,
    serializeRow: serializeUserRow,
  });

  const handleExportSelected = useCallback(async () => {
    const selectedRows = users.filter((u) => selectedUserIds.has(u.id));
    if (selectedRows.length === 0) {
      toast.info('No users selected for export');
      return;
    }
    setIsExporting(true);
    setExportTargetRows(selectedRows);
    setTimeout(async () => {
      await triggerExport();
      setIsExporting(false);
      toast.success(`Exported ${selectedRows.length} users`);
    }, 50);
  }, [users, selectedUserIds, triggerExport]);

  const handleExportAll = useCallback(async () => {
    if (users.length === 0) {
      toast.info('No users available to export');
      return;
    }
    setIsExporting(true);
    setExportTargetRows(users);
    setTimeout(async () => {
      await triggerExport();
      setIsExporting(false);
      toast.success(`Exported ${users.length} users`);
    }, 50);
  }, [users, triggerExport]);

  const activeFilterCount =
    (selectedRoles.length > 0 ? 1 : 0) +
    (selectedStatuses.length > 0 ? 1 : 0) +
    (dateRange ? 1 : 0);

  const trailingColumnCount = 2; // +1 for checkbox, +1 for actions

  // Open the impersonation reason dialog for a given user
  const handleOpenImpersonate = useCallback((user: UserRecord) => {
    setImpersonateTarget(user);
    setImpersonateReason('');
  }, []);

  const handleImpersonateSubmit = useCallback(async () => {
    if (!impersonateTarget) return;
    const trimmedReason = impersonateReason.trim();
    if (!trimmedReason) {
      toast.error('Please provide a reason for impersonation');
      impersonateReasonRef.current?.focus();
      return;
    }

    setIsImpersonating(true);
    try {
      const webOrigin =
        process.env.NEXT_PUBLIC_WEB_APP_URL || 'http://localhost:3000';

      // Check if web portal already has an active logged-in session
      try {
        const checkResp = await fetch(`${webOrigin}/api/user-context`, {
          method: 'GET',
          credentials: 'include',
        });

        if (checkResp.ok) {
          const checkData = await checkResp.json();
          if (checkData?.authenticated && checkData?.user?.email) {
            toast.error(
              `You are already logged in to the web portal as ${checkData.user.email}. Please sign out from the web portal first, then try impersonating again.`,
              { duration: 8000 },
            );
            setIsImpersonating(false);
            return;
          }
        }
      } catch (err) {
        // If check fails (e.g. network issue), log warning and continue
        console.warn('Could not check web portal session state:', err);
      }

      // Web portal is logged out — create impersonation session
      const result = await startImpersonationService({
        target_user_id: impersonateTarget.id,
        workspace_id: '00000000-0000-0000-0000-000000000000',
        reason: trimmedReason,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resObj = (result as any)?.data ?? result;
      const sessionId = resObj?.session_id;
      const tokenHash = resObj?.token_hash;

      if (!sessionId || !tokenHash) {
        console.error('Impersonation payload missing session_id or token_hash:', result);
        toast.error('Failed to generate valid impersonation credentials');
        setIsImpersonating(false);
        return;
      }

      toast.success(
        `Impersonation session started for ${impersonateTarget.full_name}. Redirecting to web app...`,
      );
      setImpersonateTarget(null);

      const impersonateCallbackUrl = `${webOrigin}/api/impersonate?session_id=${encodeURIComponent(sessionId)}`;

      const callbackParams = new URLSearchParams({
        token_hash: tokenHash,
        type: 'magiclink',
        next: impersonateCallbackUrl,
      });

      setTimeout(() => {
        window.location.href = `${webOrigin}/auth/callback?${callbackParams.toString()}`;
      }, 800);
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ?? 'Failed to start impersonation';
      toast.error(message);
    } finally {
      setIsImpersonating(false);
    }
  }, [impersonateTarget, impersonateReason]);

  return (
    <AppShell navbar={<AdminNavbar />}>
      <PageHeader
        title={`Users (${totalCount})`}
        description="Manage platform users, administrative roles, and security permissions"
      >
        <PageHeaderActions>
          <CsvExportButton
            selectedCount={selectedUserIds.size}
            onExportSelected={handleExportSelected}
            onExportAll={handleExportAll}
            isExporting={isExporting}
          />
          <ColumnVisibilitySelector
            columns={columns}
            visibility={visibility}
            onToggle={toggleVisibility}
            onReset={reset}
          />
          <Button variant="default" className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Invite User</span>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <PageBody className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col gap-4 pb-0">
          {/* List Toolbar */}
          <ListToolBar
            className="border border-border bg-white dark:bg-zinc-900 rounded-lg p-3 shrink-0"
            showSearch
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search user name or email..."
            showFilter
            filterGroups={[
              {
                key: 'role',
                label: 'Role',
                options: [
                  { value: 'Super Admin', label: 'Super Admin' },
                  { value: 'Admin', label: 'Admin' },
                  { value: 'Member', label: 'Member' },
                  { value: 'Viewer', label: 'Viewer' },
                ],
                selectedValues: selectedRoles,
                onSelectValues: setSelectedRoles,
              },
              {
                key: 'status',
                label: 'Status',
                options: [
                  { value: 'Active', label: 'Active' },
                  { value: 'Invited', label: 'Invited' },
                  { value: 'Suspended', label: 'Suspended' },
                ],
                selectedValues: selectedStatuses,
                onSelectValues: setSelectedStatuses,
              },
              {
                key: 'created_on',
                label: 'Joined On',
                type: 'date',
                dateValue: dateRange,
                onDateChange: setDateRange,
              },
            ]}
            activeFilterCount={activeFilterCount}
            onClearFilters={() => {
              setSelectedRoles([]);
              setSelectedStatuses([]);
              setDateRange(null);
              setSearchTerm('');
            }}
          />

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
                  entityLabel="users"
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
                        aria-label="Select all users"
                      />
                    </TableHead>

                    {/* S. No. */}
                    {isVisible('sno') && (
                      <TableHead {...getHeaderProps('sno')} className="relative w-12 text-center">
                        S. No.
                        <span className="col-resize-handle" {...getResizeHandleProps('sno')} />
                      </TableHead>
                    )}

                    {/* Full Name */}
                    {isVisible('full_name') && (
                      <ColumnHeader
                        columnId="full_name"
                        label="Full Name"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                        className="relative"
                        {...getHeaderProps('full_name')}
                      >
                        <span className="col-resize-handle" {...getResizeHandleProps('full_name')} />
                      </ColumnHeader>
                    )}

                    {/* Email */}
                    {isVisible('email') && (
                      <ColumnHeader
                        columnId="email"
                        label="Email Address"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                        className="relative"
                        {...getHeaderProps('email')}
                      >
                        <span className="col-resize-handle" {...getResizeHandleProps('email')} />
                      </ColumnHeader>
                    )}

                    {/* Role */}
                    {isVisible('role') && (
                      <ColumnHeader
                        columnId="role"
                        label="Role"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                        className="relative"
                        {...getHeaderProps('role')}
                      >
                        <span className="col-resize-handle" {...getResizeHandleProps('role')} />
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

                    {/* Workspaces Count */}
                    {isVisible('workspaces_count') && (
                      <ColumnHeader
                        columnId="workspaces_count"
                        label="Workspaces"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                        className="relative"
                        {...getHeaderProps('workspaces_count')}
                      >
                        <span className="col-resize-handle" {...getResizeHandleProps('workspaces_count')} />
                      </ColumnHeader>
                    )}

                    {/* Last Login */}
                    {isVisible('last_login') && (
                      <ColumnHeader
                        columnId="last_login"
                        label="Last Login"
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                        className="relative"
                        {...getHeaderProps('last_login')}
                      >
                        <span className="col-resize-handle" {...getResizeHandleProps('last_login')} />
                      </ColumnHeader>
                    )}

                    {/* Joined Date */}
                    {isVisible('created_at') && (
                      <ColumnHeader
                        columnId="created_at"
                        label="Joined On"
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
                    <TableHead className="w-12 text-right pr-4">Actions</TableHead>
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
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={
                          Object.values(visibility).filter(Boolean).length +
                          trailingColumnCount
                        }
                        className="h-32 text-center text-muted-foreground"
                      >
                        No users found matching your search or filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u, idx) => {
                      const isSelected = selectedUserIds.has(u.id);
                      const serialNumber = (currentPage - 1) * pageSize + idx + 1;
                      return (
                        <TableRow
                          key={u.id}
                          data-state={isSelected ? 'selected' : undefined}
                          className="group"
                        >
                          {/* Checkbox */}
                          <TableCell className="pl-4">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleSelectRow(u.id)}
                              aria-label={`Select ${u.full_name}`}
                            />
                          </TableCell>

                          {/* S. No. */}
                          {isVisible('sno') && (
                            <TableCell className="text-center font-mono text-xs text-muted-foreground">
                              {serialNumber}
                            </TableCell>
                          )}

                          {/* Full Name */}
                          {isVisible('full_name') && (
                            <TableCell className="font-medium text-zinc-900 dark:text-white">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold text-xs flex-shrink-0">
                                  {u.full_name.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="font-semibold text-sm hover:underline cursor-pointer">
                                  {u.full_name}
                                </span>
                              </div>
                            </TableCell>
                          )}

                          {/* Email */}
                          {isVisible('email') && (
                            <TableCell className="text-sm text-muted-foreground font-mono">
                              {u.email}
                            </TableCell>
                          )}

                          {/* Role */}
                          {isVisible('role') && (
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  u.role === 'Super Admin'
                                    ? 'border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                    : 'font-normal'
                                }
                              >
                                {u.role}
                              </Badge>
                            </TableCell>
                          )}

                          {/* Status */}
                          {isVisible('status') && (
                            <TableCell>
                              <Badge
                                className={
                                  u.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 hover:bg-emerald-50'
                                    : u.status === 'Invited'
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400 hover:bg-blue-50'
                                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400 hover:bg-rose-50'
                                }
                              >
                                {u.status}
                              </Badge>
                            </TableCell>
                          )}

                          {/* Workspaces Count */}
                          {isVisible('workspaces_count') && (
                            <TableCell className="text-sm font-medium">
                              {u.workspaces_count} workspaces
                            </TableCell>
                          )}

                          {/* Last Login */}
                          {isVisible('last_login') && (
                            <TableCell className="text-sm text-muted-foreground">
                              {u.last_login}
                            </TableCell>
                          )}

                          {/* Joined Date */}
                          {isVisible('created_at') && (
                            <TableCell className="text-sm text-muted-foreground">
                              {u.created_at}
                            </TableCell>
                          )}

                          {/* Action Menu */}
                          <TableCell className="text-right pr-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem className="gap-2">
                                  <Edit className="h-3.5 w-3.5" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2">
                                  <Key className="h-3.5 w-3.5" />
                                  Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2">
                                  <Shield className="h-3.5 w-3.5" />
                                  Manage Permissions
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-amber-600 focus:text-amber-600"
                                  onSelect={() => handleOpenImpersonate(u)}
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                  Impersonate User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="gap-2 text-rose-600 focus:text-rose-600">
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Suspend User
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

      {/* Impersonation Reason Dialog */}
      <Dialog
        open={!!impersonateTarget}
        onOpenChange={(open) => { if (!open) setImpersonateTarget(null); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-amber-600" />
              Impersonate User
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {impersonateTarget && (
              <p className="text-sm text-muted-foreground">
                You are about to start an impersonation session for{' '}
                <span className="font-semibold text-foreground">
                  {impersonateTarget.full_name}
                </span>{' '}
                ({impersonateTarget.email}). This session will expire in 30 minutes.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="impersonate-reason">
                Reason for Access <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="impersonate-reason"
                ref={impersonateReasonRef}
                placeholder="e.g. Customer Support, Bug Investigation, Data Verification…"
                value={impersonateReason}
                onChange={(e) => setImpersonateReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImpersonateTarget(null)}
              disabled={isImpersonating}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="gap-2 bg-amber-600 hover:bg-amber-700"
              onClick={handleImpersonateSubmit}
              disabled={isImpersonating || !impersonateReason.trim()}
            >
              {isImpersonating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <UserCheck className="h-3.5 w-3.5" />
                  Start Session
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
