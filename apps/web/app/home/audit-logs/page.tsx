'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { format } from 'date-fns';
import { Eye } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import CustomTableContainer from '@kit/ui/custom-table-container';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@kit/ui/pagination';
import { PageSizeSelector } from '@kit/ui/page-size-selector';
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
import { useColumnVisibility } from '@kit/ui/use-column-visibility';

import { useDebounce } from '~/lib/hooks/use-debounce';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getAuditLogsService } from '~/services/audit-logs.service';

export default function AuditLogsPage() {
  const { currentWorkspace: workspace } = useRBAC();
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

  const activeFilterCount =
    (selectedModule !== 'all' ? 1 : 0) + (selectedAction !== 'all' ? 1 : 0) + (selectedProduct !== 'all' && !contextProductKey ? 1 : 0);

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

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      'audit-logs',
      workspace?.id,
      page,
      selectedModule,
      selectedAction,
      selectedProduct,
      itemsPerPage,
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
  }, [debouncedSearchTerm, selectedModule, selectedAction, selectedProduct]);

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
    return groups;
  }, [selectedModule, selectedAction, selectedProduct, contextProductKey]);

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
              <CustomTableContainer pagination={count > 0 && (
                  <div className="primary-text-regular text-leadgaze-muted bg-sidebar sticky bottom-0 z-10 -mx-4 flex shrink-0 items-center justify-between border-t px-4 py-1.5 lg:-mx-8 lg:px-8">
                  <div className="flex items-center gap-1">
                    Showing{' '}
                    <span className="text-foreground font-medium">
                      {(page - 1) * itemsPerPage + 1}
                    </span>{' '}
                    to{' '}
                    <span className="text-foreground font-medium">
                      {Math.min(page * itemsPerPage, count)}
                    </span>{' '}
                    of{' '}
                    <span className="text-foreground font-medium">{count}</span>{' '}
                    logs
                  </div>
                  <div className="flex w-full max-w-full min-w-0 items-center justify-end px-2">
                                        <PageSizeSelector
                                        value={pageSize}
                                        onChange={(val) => {
                                          setPageSize(val);
                                          setPage(1);
                                        }}
                                      />
                                    </div>
                  <Pagination className="w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          className={
                            page === 1
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        />
                      </PaginationItem>
                      {(() => {
                        const visiblePages: (number | string)[] = [];
                        const delta = 1; // Number of pages to show before and after current page

                        if (totalPages <= 7) {
                          // If total pages is small, show all
                          for (let i = 1; i <= totalPages; i++)
                            visiblePages.push(i);
                        } else {
                          visiblePages.push(1); // Always show first

                          if (page > delta + 2) {
                            visiblePages.push('ellipsis-start');
                          }

                          const start = Math.max(2, page - delta);
                          const end = Math.min(totalPages - 1, page + delta);

                          for (let i = start; i <= end; i++) visiblePages.push(i);

                          if (page < totalPages - (delta + 1)) {
                            visiblePages.push('ellipsis-end');
                          }

                          visiblePages.push(totalPages); // Always show last
                        }

                        return visiblePages.map((p, i) => {
                          if (typeof p === 'string') {
                            return (
                              <PaginationItem key={`ellipsis-${i}`}>
                                <span className="px-2">...</span>
                              </PaginationItem>
                            );
                          }
                          return (
                            <PaginationItem key={p}>
                              <PaginationLink
                                isActive={page === p}
                                onClick={() => setPage(p)}
                                className="cursor-pointer"
                              >
                                {p}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        });
                      })()}
                      <PaginationItem>
                        <PaginationNext
                          className={
                            page === totalPages
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                  </div>
                  )}>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
                        {isVisible('date_time') && (
                          <TableHead className="w-[160px] h-11 text-xs uppercase tracking-wider font-semibold whitespace-nowrap">
                            Date & Time
                          </TableHead>
                        )}
                        {isVisible('actor') && (
                          <TableHead className="w-[200px] h-11 text-xs uppercase tracking-wider font-semibold whitespace-nowrap">
                            Actor
                          </TableHead>
                        )}
                        {isVisible('module') && (
                          <TableHead className="w-[140px] h-11 text-xs uppercase tracking-wider font-semibold whitespace-nowrap">
                            Module
                          </TableHead>
                        )}
                        {isVisible('action') && (
                          <TableHead className="w-[120px] h-11 text-xs uppercase tracking-wider font-semibold whitespace-nowrap">
                            Action
                          </TableHead>
                        )}
                        {isVisible('entity') && (
                          <TableHead className="w-full h-11 text-xs uppercase tracking-wider font-semibold whitespace-nowrap">
                            Entity
                          </TableHead>
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
                        logs.map((log: any) => (
                          <TableRow
                            key={log.id}
                            className="group hover:bg-muted/30 transition-colors border-b last:border-0"
                          >
                            {isVisible('date_time') && (
                              <TableCell className="py-3 align-middle">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm font-medium">
                                    {format(
                                      new Date(log.created_at),
                                      'MMM d, yyyy',
                                    )}
                                  </span>
                                  <span className="text-muted-foreground text-xs font-normal">
                                    {format(
                                      new Date(log.created_at),
                                      'hh:mm:ss a',
                                    )}
                                  </span>
                                </div>
                              </TableCell>
                            )}
                            {isVisible('actor') && (
                              <TableCell className="py-3 align-middle">
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
                              <TableCell className="py-3 align-middle">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-600"></div>
                                  <span className="text-sm font-medium text-foreground/80">
                                    {getModuleLabel(log.module)}
                                  </span>
                                </div>
                              </TableCell>
                            )}
                            {isVisible('action') && (
                              <TableCell className="py-3 align-middle">
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
                              <TableCell className="py-3 align-middle w-full max-w-[200px] sm:max-w-auto">
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
                            <TableCell className="bg-card sticky right-0 py-3 text-right align-middle">
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
