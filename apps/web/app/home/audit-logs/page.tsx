'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { Eye } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import CustomTableContainer from '@kit/ui/custom-table-container';
import { TablePagination } from '@kit/ui/table-pagination';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader } from '@kit/ui/page';

import { Separator } from '@kit/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@kit/ui/sheet';
import { Skeleton } from '@kit/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { useColumnResize } from '@kit/ui/use-column-resize';
import { useTableSort } from '@kit/ui/use-table-sort';
import { SortableTableHead } from '@kit/ui/sortable-table-head';

import { useDebounce } from '~/lib/hooks/use-debounce';
import { useLocalization } from '~/lib/localization/localization-provider';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getAuditLogsService } from '~/services/audit-logs.service';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';
import { useDateRangeFilter } from '@kit/ui/use-date-range-filter';

export default function AuditLogsPage() {
  const { currentWorkspace: workspace } = useRBAC();
  const { formatDate, formatDateTime } = useLocalization();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const pathname = usePathname();
  const productContextMatch = pathname.match(/^\/home\/([^/]+)\/audit-logs/);
  const contextProductKey = productContextMatch ? productContextMatch[1] : null;
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>(contextProductKey || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const itemsPerPage = pageSize;

  const {
    dateRange: createdOnRange,
    setDateRange: setCreatedOnRange,
    computedDates: computedCreatedOnDates,
    clearDateRange: clearCreatedOnRange,
  } = useDateRangeFilter();

  const activeFilterCount =
    (selectedModule !== 'all' ? 1 : 0) +
    (selectedAction !== 'all' ? 1 : 0) +
    (selectedProduct !== 'all' && !contextProductKey ? 1 : 0) +
    (createdOnRange ? 1 : 0);

  const columns = useMemo(
    () => [
      { id: 'date_time', label: 'Date & Time' },
      { id: 'actor', label: 'Actor' },
      { id: 'module', label: 'Module' },
      { id: 'action', label: 'Action' },
      { id: 'entity', label: 'Entity' },
    ],
    [],
  );

  const { visibility, toggleVisibility, isVisible, reset } =
    useColumnVisibility('audit-logs', {
      date_time: true,
      actor: true,
      module: true,
      action: true,
      entity: true,
    });

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('audit-logs');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      'audit-logs',
      workspace?.id,
      page,
      selectedModule,
      selectedAction,
      selectedProduct,
      itemsPerPage,
      computedCreatedOnDates,
    ],
    queryFn: () => {
      if (!workspace?.id) return null;
      return getAuditLogsService({
        workspaceId: workspace.id,
        page,
        limit: itemsPerPage,
        module: selectedModule === 'all' ? undefined : selectedModule,
        action: selectedAction === 'all' ? undefined : selectedAction,
        productKey: selectedProduct === 'all' ? undefined : selectedProduct,
        createdAtFrom: computedCreatedOnDates?.from ?? undefined,
        createdAtTo: computedCreatedOnDates?.to ?? undefined,
      });
    },
    enabled: !!workspace?.id,
  });

  const logs = useMemo(() => {
    const allLogs = data?.logs || [];
    if (!debouncedSearchTerm) return allLogs;
    const term = debouncedSearchTerm.toLowerCase();
    return allLogs.filter((log: any) =>
      (log.actor?.name || '').toLowerCase().includes(term) ||
      (log.actor?.email || '').toLowerCase().includes(term) ||
      (log.module || '').toLowerCase().includes(term) ||
      (log.action || '').toLowerCase().includes(term) ||
      (log.entity_name || '').toLowerCase().includes(term),
    );
  }, [data?.logs, debouncedSearchTerm]);

  const { sortColumn, sortDirection, toggleSort, sortedData } = useTableSort<any>(
    'audit-logs',
    logs,
  );
  const count = data?.count || 0;
  const totalPages = Math.ceil(count / itemsPerPage);

  const getActionStyles = (action: string) => {
    switch (action) {
      case 'CREATE':
        return { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/20' };
      case 'UPDATE':
        return { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' };
      case 'DELETE':
        return { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' };
      case 'READ':
        return { bg: 'bg-gray-500/10', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-500/20' };
      default:
        return { bg: 'bg-gray-500/10', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-500/20' };
    }
  };

  const getModuleLabel = (module: string) => {
    return module.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Reset to first page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, selectedModule, selectedAction, selectedProduct, createdOnRange]);

  const filterGroups = useMemo(() => {
    const groups = [
      {
        key: 'module',
        label: 'Module',
        selectedValue: selectedModule === 'all' ? '' : selectedModule,
        selectedLabel: selectedModule === 'all' ? 'All modules' : getModuleLabel(selectedModule),
        options: [
          'leads', 'contacts', 'accounts', 'opportunities',
          'team_members', 'roles', 'role_permissions',
          'notes', 'reminders', 'meetings', 'documents',
        ].map((mod) => ({
          value: mod,
          label: getModuleLabel(mod),
        })),
        onSelect: (val: string) => setSelectedModule(val || 'all'),
      },
      {
        key: 'action',
        label: 'Action Type',
        selectedValue: selectedAction === 'all' ? '' : selectedAction,
        selectedLabel: selectedAction === 'all' ? 'All actions' : selectedAction,
        options: ['CREATE', 'UPDATE', 'DELETE', 'READ'].map((act) => ({
          value: act,
          label: act,
          color: act === 'CREATE' ? '#22c55e' : act === 'UPDATE' ? '#3b82f6' : act === 'DELETE' ? '#ef4444' : '#6b7280',
        })),
        onSelect: (val: string) => setSelectedAction(val || 'all'),
      },
    ];
    if (!contextProductKey) {
      groups.push({
        key: 'product',
        label: 'Product',
        selectedValue: selectedProduct === 'all' ? '' : selectedProduct,
        selectedLabel: selectedProduct === 'all' ? 'All products' : getModuleLabel(selectedProduct),
        options: ['sales', 'hrms', 'inventory', 'service_cloud', 'funds', 'common'].map((prod) => ({
          value: prod,
          label: getModuleLabel(prod),
        })),
        onSelect: (val: string) => setSelectedProduct(val || 'all'),
      });
    }
    groups.push({
      key: 'created_on',
      label: 'Created On',
      type: 'date',
      dateValue: createdOnRange,
      onDateChange: (val) => {
        setCreatedOnRange(val);
        setPage(1);
      },
    } as any);
    return groups;
  }, [selectedModule, selectedAction, selectedProduct, contextProductKey, createdOnRange]);

  return (
    <ModuleGuard module="audit_logs">
      <div className="flex shrink-0 flex-col gap-2 overflow-hidden">
        <PageHeader
          title={`Audit Logs (${count})`}
          description="Track all activities and changes within your workspace"
        />
      </div>

      {/* Toolbar with search, filters, column visibility */}
      <div className="w-full max-w-full min-w-0 shrink-0 border-b pb-2">
        <ListToolBar
          showSearch
          searchPlaceholder="Search logs..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          showFilter
          filterGroups={filterGroups}
          activeFilterCount={activeFilterCount}
          onClearFilters={() => {
            setSelectedModule('all');
            setSelectedAction('all');
            if (!contextProductKey) setSelectedProduct('all');
            clearCreatedOnRange();
          }}
          columnVisibilitySlot={
            <ColumnVisibilitySelector
              columns={columns}
              visibility={visibility}
              onToggle={toggleVisibility}
              onReset={reset}
            />
          }
        />
      </div>

        <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden pt-2">
            <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 gap-0">
              <CustomTableContainer pagination={
                <TablePagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalCount={count}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(val) => {
                    setPageSize(val);
                    setPage(1);
                  }}
                  entityLabel="logs"
                />
              }>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
                        {isVisible('date_time') && (
                          <SortableTableHead
                            label="Date & Time"
                            columnId="date_time"
                            sortKey="created_at"
                            sortColumn={sortColumn}
                            sortDirection={sortDirection}
                            onSort={toggleSort}
                            className="relative w-[160px] h-11 text-xs uppercase tracking-wider font-semibold whitespace-nowrap"
                            {...getHeaderProps('date_time')}
                          >
                            <span className="col-resize-handle" {...getResizeHandleProps('date_time')} />
                          </SortableTableHead>
                        )}
                        {isVisible('actor') && (
                          <SortableTableHead
                            label="Actor"
                            columnId="actor"
                            sortKey="actor.name"
                            sortColumn={sortColumn}
                            sortDirection={sortDirection}
                            onSort={toggleSort}
                            sortable={false}
                            className="relative w-[200px] h-11 text-xs uppercase tracking-wider font-semibold whitespace-nowrap"
                            {...getHeaderProps('actor')}
                          >
                            <span className="col-resize-handle" {...getResizeHandleProps('actor')} />
                          </SortableTableHead>
                        )}
                        {isVisible('module') && (
                          <SortableTableHead
                            label="Module"
                            columnId="module"
                            sortColumn={sortColumn}
                            sortDirection={sortDirection}
                            onSort={toggleSort}
                            sortable={false}
                            className="relative w-[140px] h-11 text-xs uppercase tracking-wider font-semibold whitespace-nowrap"
                            {...getHeaderProps('module')}
                          >
                            <span className="col-resize-handle" {...getResizeHandleProps('module')} />
                          </SortableTableHead>
                        )}
                        {isVisible('action') && (
                          <SortableTableHead
                            label="Action"
                            columnId="action"
                            sortColumn={sortColumn}
                            sortDirection={sortDirection}
                            onSort={toggleSort}
                            sortable={false}
                            className="relative w-[120px] h-11 text-xs uppercase tracking-wider font-semibold whitespace-nowrap"
                            {...getHeaderProps('action')}
                          >
                            <span className="col-resize-handle" {...getResizeHandleProps('action')} />
                          </SortableTableHead>
                        )}
                        {isVisible('entity') && (
                          <SortableTableHead
                            label="Entity"
                            columnId="entity"
                            sortKey="entity_name"
                            sortColumn={sortColumn}
                            sortDirection={sortDirection}
                            onSort={toggleSort}
                            sortable={false}
                            className="relative w-full h-11 text-xs uppercase tracking-wider font-semibold whitespace-nowrap"
                            {...getHeaderProps('entity')}
                          >
                            <span className="col-resize-handle" {...getResizeHandleProps('entity')} />
                          </SortableTableHead>
                        )}
                        <TableHead className="sticky-right-header w-[80px] h-11 text-xs uppercase tracking-wider font-semibold text-right whitespace-nowrap">
                          Details
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <>
                          {[...Array(12)].map((_, i) => (
                            <TableRow key={i}>
                              <TableCell
                                className="h-[52px] px-4 py-2"
                                colSpan={
                                  visibility
                                    ? Object.values(visibility).filter(
                                      (v) => v !== false,
                                    ).length + 1
                                    : 6
                                }
                              >
                                <Skeleton className="h-7 w-full" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      ) : logs.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={
                              visibility
                                ? Object.values(visibility).filter(
                                  (v) => v !== false,
                                ).length + 1
                                : 6
                            }
                            className="h-32 text-center"
                          >
                            <p className="text-muted-foreground">
                              No audit logs found matching your criteria.
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedData.map((log: any) => (
                          <TableRow
                            key={log.id}
                            className="group hover:bg-muted/30 transition-colors border-b last:border-0"
                          >
                            {isVisible('date_time') && (
                              <TableCell className="py-2 align-middle">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm font-medium">
                                    {formatDate(log.created_at)}
                                  </span>
                                  <span className="text-muted-foreground text-xs font-normal">
                                    {new Intl.DateTimeFormat(undefined, {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                      hour12: true,
                                    }).format(new Date(log.created_at))}
                                  </span>
                                </div>
                              </TableCell>
                            )}
                            {isVisible('actor') && (
                              <TableCell className="py-2 align-middle">
                                <div className="flex items-center gap-3">
                                  <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ring-primary/20">
                                    {log.actor?.name?.[0] ||
                                      log.actor?.email?.[0] ||
                                      '?'}
                                  </div>
                                  <div className="flex min-w-0 flex-col">
                                    <span className="truncate text-sm font-medium">
                                      {log.actor?.name || 'System'}
                                    </span>
                                    <span className="text-muted-foreground truncate text-xs">
                                      {log.actor?.email}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                            )}
                            {isVisible('module') && (
                              <TableCell className="py-2 align-middle">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-600"></div>
                                  <span className="text-sm font-medium text-foreground/80">
                                    {getModuleLabel(log.module)}
                                  </span>
                                </div>
                              </TableCell>
                            )}
                            {isVisible('action') && (
                              <TableCell className="py-2 align-middle">
                                {(() => {
                                  const styles = getActionStyles(log.action);
                                  return (
                                    <Badge
                                      variant="outline"
                                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide border ${styles.bg} ${styles.text} ${styles.border}`}
                                    >
                                      {log.action}
                                    </Badge>
                                  );
                                })()}
                              </TableCell>
                            )}
                            {isVisible('entity') && (
                              <TableCell className="py-2 align-middle w-full max-w-[200px] sm:max-w-auto">
                                <div className="flex flex-col gap-0.5">
                                  <span className="truncate text-sm font-medium">
                                    {log.entity_name || '-'}
                                  </span>
                                  <span className="text-muted-foreground truncate font-mono text-[11px]">
                                    {log.entity_id.split('-')[0]}...
                                  </span>
                                </div>
                              </TableCell>
                            )}
                            <TableCell className="bg-card sticky right-0 py-2 text-right align-middle">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                                onClick={() => setSelectedLog(log)}
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">View Details</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
              </CustomTableContainer>
            </div>
        
      

      <Sheet
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <SheetContent className="overflow-y-auto sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Transaction Details</SheetTitle>
            <SheetDescription>Full audit data for this event</SheetDescription>
          </SheetHeader>

          {selectedLog && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase">
                    Action
                  </p>
                  {(() => {
                    const styles = getActionStyles(selectedLog.action);
                    return (
                      <Badge
                        variant="outline"
                        className={`mt-1 rounded-full px-3 py-1 text-xs font-bold border ${styles.bg} ${styles.text} ${styles.border}`}
                      >
                        {selectedLog.action}
                      </Badge>
                    );
                  })()}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase">
                    Module
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {getModuleLabel(selectedLog.module)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  Entity
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {selectedLog.entity_name || 'N/A'}
                </p>
                <p className="text-muted-foreground font-mono text-xs">
                  {selectedLog.entity_id}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                  Data States
                </p>
                <div className="space-y-4">
                  {selectedLog.old_data && (
                    <div>
                      <p className="mb-1 text-[10px] font-bold text-red-500 uppercase">
                        Previous State (Old)
                      </p>
                      <div className="overflow-x-auto rounded border border-red-500/20 bg-slate-950 p-3">
                        <pre className="font-mono text-[11px] leading-relaxed text-slate-300">
                          {JSON.stringify(selectedLog.old_data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {selectedLog.new_data && (
                    <div>
                      <p className="mb-1 text-[10px] font-bold text-green-500 uppercase">
                        New State (Changes)
                      </p>
                      <div className="overflow-x-auto rounded border border-green-500/20 bg-slate-950 p-3">
                        <pre className="font-mono text-[11px] leading-relaxed text-slate-300">
                          {JSON.stringify(selectedLog.new_data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {!selectedLog.old_data && !selectedLog.new_data && (
                    <p className="text-muted-foreground text-sm italic">
                      No detailed data captured for this action.
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full font-bold">
                  {selectedLog.actor?.name?.[0] ||
                    selectedLog.actor?.email?.[0] ||
                    '?'}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {selectedLog.actor?.name || 'System'}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {selectedLog.actor?.email}
                  </p>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      </PageBody>
    </ModuleGuard>
  );
}
