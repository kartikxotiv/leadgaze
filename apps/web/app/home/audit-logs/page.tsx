'use client';

import React, { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  History,
  Search,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { Input } from '@kit/ui/input';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@kit/ui/pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Separator } from '@kit/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@kit/ui/sheet';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';

import { Skeleton } from '@kit/ui/skeleton';

import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getAuditLogsService } from '~/services/audit-logs.service';

export default function AuditLogsPage() {
  const { currentWorkspace: workspace } = useRBAC();
  const [page, setPage] = useState(1);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterView, setFilterView] = useState<'main' | 'module' | 'action'>(
    'main',
  );
  const itemsPerPage = 15;

  const activeFilterCount =
    (selectedModule !== 'all' ? 1 : 0) + (selectedAction !== 'all' ? 1 : 0);

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
      });
    },
    enabled: !!workspace?.id,
  });

  const logs = data?.logs || [];
  const count = data?.count || 0;
  const totalPages = Math.ceil(count / itemsPerPage);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'UPDATE':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'DELETE':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'READ':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getModuleLabel = (module: string) => {
    return module.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <ModuleGuard module="audit_logs">
      <div className="flex h-[100dvh] w-full max-w-full min-w-0 flex-col overflow-hidden">
        <PageHeader
          className="bg-sidebar"
          title={`Audit Logs (${count})`}
          description="Track all activities and changes within your workspace"
        >
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Popover
                open={isFilterOpen}
                onOpenChange={(open) => {
                  setIsFilterOpen(open);
                  if (!open) setFilterView('main');
                }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button
                        className={`border-input hover:bg-accent relative flex h-8 w-8 items-center justify-center rounded-md border bg-transparent bg-white dark:border-zinc-700 dark:bg-zinc-900 ${isFilterOpen ? 'bg-accent' : ''
                          }`}
                      >
                        <Filter className="h-4 w-4 text-gray-500 dark:text-white" />
                        {activeFilterCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#4eacff] text-[10px] font-bold text-white">
                            {activeFilterCount}
                          </span>
                        )}
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Filter</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                      {filterView !== 'main' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setFilterView('main')}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      )}
                      <span className="text-sm font-semibold">
                        {filterView === 'main'
                          ? 'Filters'
                          : filterView === 'module'
                            ? 'Filter by Module'
                            : 'Filter by Action'}
                      </span>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-foreground text-xs underline"
                      onClick={() => {
                        setSelectedModule('all');
                        setSelectedAction('all');
                        setPage(1);
                      }}
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="p-2">
                    {filterView === 'main' && (
                      <div className="flex flex-col gap-1">
                        <button
                          className="hover:bg-muted/50 flex w-full items-center justify-between rounded-md p-3 text-left text-sm font-medium transition-colors"
                          onClick={() => setFilterView('module')}
                        >
                          <div className="flex flex-col gap-1">
                            <span>Module</span>
                            <span className="text-muted-foreground text-xs font-normal">
                              {selectedModule === 'all'
                                ? 'All modules'
                                : getModuleLabel(selectedModule)}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </button>
                        <button
                          className="hover:bg-muted/50 flex w-full items-center justify-between rounded-md p-3 text-left text-sm font-medium transition-colors"
                          onClick={() => setFilterView('action')}
                        >
                          <div className="flex flex-col gap-1">
                            <span>Action Type</span>
                            <span className="text-muted-foreground text-xs font-normal">
                              {selectedAction === 'all'
                                ? 'All actions'
                                : selectedAction}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    )}

                    {filterView === 'module' && (
                      <div className="flex flex-col gap-1 p-1">
                        {[
                          'all',
                          'leads',
                          'contacts',
                          'accounts',
                          'opportunities',
                          'team_members',
                          'roles',
                          'role_permissions',
                          'notes',
                          'reminders',
                          'meetings',
                          'documents',
                        ].map((mod) => {
                          const isSelected = selectedModule === mod;
                          return (
                            <div
                              key={mod}
                              className="hover:bg-muted/80 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
                              onClick={() => {
                                setSelectedModule(mod);
                                setPage(1);
                              }}
                            >
                              <div
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${isSelected
                                    ? 'border-black bg-transparent dark:border-white'
                                    : 'border-black/20 bg-transparent dark:border-white/30'
                                  }`}
                              >
                                {isSelected && (
                                  <div className="h-2 w-2 rounded-full bg-black dark:bg-white" />
                                )}
                              </div>
                              <span className="text-black capitalize dark:text-gray-200">
                                {mod === 'all'
                                  ? 'All Modules'
                                  : getModuleLabel(mod)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {filterView === 'action' && (
                      <div className="flex flex-col gap-1 p-1">
                        {['all', 'CREATE', 'UPDATE', 'DELETE', 'READ'].map(
                          (act) => {
                            const isSelected = selectedAction === act;
                            return (
                              <div
                                key={act}
                                className="hover:bg-muted/80 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
                                onClick={() => {
                                  setSelectedAction(act);
                                  setPage(1);
                                }}
                              >
                                <div
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${isSelected
                                      ? 'border-black bg-transparent dark:border-white'
                                      : 'border-black/20 bg-transparent dark:border-white/30'
                                    }`}
                                >
                                  {isSelected && (
                                    <div className="h-2 w-2 rounded-full bg-black dark:bg-white" />
                                  )}
                                </div>
                                <span className="text-black capitalize dark:text-gray-200">
                                  {act === 'all'
                                    ? 'All Actions'
                                    : act.toLowerCase()}
                                </span>
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </TooltipProvider>

            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-dashed"
                onClick={() => {
                  setSelectedModule('all');
                  setSelectedAction('all');
                  setPage(1);
                }}
              >
                Reset Filters
              </Button>
            )}

            <div className="mx-1 hidden h-6 w-px bg-gray-200 lg:block" />

            <ColumnVisibilitySelector
              columns={columns}
              visibility={visibility}
              onToggle={toggleVisibility}
              onReset={reset}
            />
          </div>
        </PageHeader>

        <PageBody className="bg-sidebar flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden pt-6">
          <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col space-y-6">
            {/* Table */}
            <Card className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col border-none shadow-none">
              <CardContent className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col p-0 text-[13px]">
                <div className="listing-table-container min-w-0 flex-1 overflow-x-auto overflow-y-auto rounded-lg pb-6">
                  <table className="w-max min-w-full caption-bottom border-separate border-spacing-0 text-sm">
                    <TableHeader className="bg-card sticky top-0 z-20 shadow-sm">
                      <TableRow>
                        {isVisible('date_time') && (
                          <TableHead className="bg-card w-[180px] whitespace-nowrap">
                            Date & Time
                          </TableHead>
                        )}
                        {isVisible('actor') && (
                          <TableHead className="bg-card w-[180px] whitespace-nowrap">
                            Actor
                          </TableHead>
                        )}
                        {isVisible('module') && (
                          <TableHead className="bg-card w-[120px] whitespace-nowrap">
                            Module
                          </TableHead>
                        )}
                        {isVisible('action') && (
                          <TableHead className="bg-card w-[120px] whitespace-nowrap">
                            Action
                          </TableHead>
                        )}
                        {isVisible('entity') && (
                          <TableHead className="bg-card whitespace-nowrap">
                            Entity
                          </TableHead>
                        )}
                        <TableHead className="bg-card sticky right-0 z-30 border-l text-right whitespace-nowrap">
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
                            className="group hover:bg-muted/30 transition-colors"
                          >
                            {isVisible('date_time') && (
                              <TableCell className="text-xs font-medium">
                                <div className="flex flex-col">
                                  <span>
                                    {format(
                                      new Date(log.created_at),
                                      'MMM d, yyyy',
                                    )}
                                  </span>
                                  <span className="text-muted-foreground font-normal">
                                    {format(
                                      new Date(log.created_at),
                                      'HH:mm:ss',
                                    )}
                                  </span>
                                </div>
                              </TableCell>
                            )}
                            {isVisible('actor') && (
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold">
                                    {log.actor?.name?.[0] ||
                                      log.actor?.email?.[0] ||
                                      '?'}
                                  </div>
                                  <div className="flex min-w-0 flex-col">
                                    <span className="truncate text-xs font-medium">
                                      {log.actor?.name || 'System'}
                                    </span>
                                    <span className="text-muted-foreground truncate text-[10px]">
                                      {log.actor?.email}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                            )}
                            {isVisible('module') && (
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="py-0 text-[10px] font-medium capitalize"
                                >
                                  {getModuleLabel(log.module)}
                                </Badge>
                              </TableCell>
                            )}
                            {isVisible('action') && (
                              <TableCell>
                                <Badge
                                  className={`border px-2 py-0 text-[10px] font-bold ${getActionColor(log.action)}`}
                                >
                                  {log.action}
                                </Badge>
                              </TableCell>
                            )}
                            {isVisible('entity') && (
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="max-w-[200px] truncate text-xs font-medium">
                                    {log.entity_name || '-'}
                                  </span>
                                  <span className="text-muted-foreground truncate font-mono text-[10px]">
                                    {log.entity_id.split('-')[0]}...
                                  </span>
                                </div>
                              </TableCell>
                            )}
                            <TableCell className="bg-card sticky right-0 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={() => setSelectedLog(log)}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {count > 0 && (
              <div className="text-muted-foreground bg-sidebar sticky bottom-0 z-10 -mx-4 flex shrink-0 items-center justify-between border-t px-4 py-1.5 lg:-mx-8 lg:px-8">
                <div>
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
            )}
          </div>
        </PageBody>
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
                  <Badge
                    className={`mt-1 font-bold ${getActionColor(selectedLog.action)}`}
                  >
                    {selectedLog.action}
                  </Badge>
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
    </ModuleGuard>
  );
}
