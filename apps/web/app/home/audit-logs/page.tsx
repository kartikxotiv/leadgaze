'use client';

import React, { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowRight, Filter, History, Search } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { Input } from '@kit/ui/input';
import { PageBody, PageHeader } from '@kit/ui/page';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';

import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getAuditLogsService } from '~/services/audit-logs.service';

export default function AuditLogsPage() {
  const { currentWorkspace: workspace } = useRBAC();
  const [page, setPage] = useState(1);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const limit = 50;

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
    ],
    queryFn: () => {
      if (!workspace?.id) return null;
      return getAuditLogsService({
        workspaceId: workspace.id,
        page,
        limit,
        module: selectedModule === 'all' ? undefined : selectedModule,
        action: selectedAction === 'all' ? undefined : selectedAction,
      });
    },
    enabled: !!workspace?.id,
  });

  const logs = data?.logs || [];
  const count = data?.count || 0;
  const totalPages = Math.ceil(count / limit);

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
      <PageHeader
        title={`Audit Logs (${count})`}
        description="Track all activities and changes within your workspace"
      >
        <div className="flex items-center gap-3">
          <div className="mx-1 hidden h-6 w-px bg-gray-200 lg:block" />

          <ColumnVisibilitySelector
            columns={columns}
            visibility={visibility}
            onToggle={toggleVisibility}
            onReset={reset}
          />
        </div>
      </PageHeader>

      <PageBody>
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-[200px] flex-1">
                  <p className="text-muted-foreground mb-1.5 ml-1 text-xs font-medium tracking-wider uppercase">
                    Module
                  </p>
                  <Select
                    value={selectedModule}
                    onValueChange={(val) => {
                      setSelectedModule(val);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Modules" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modules</SelectItem>
                      <SelectItem value="leads">Leads</SelectItem>
                      <SelectItem value="contacts">Contacts</SelectItem>
                      <SelectItem value="accounts">Accounts</SelectItem>
                      <SelectItem value="opportunities">
                        Opportunities
                      </SelectItem>
                      <SelectItem value="team_members">Team Members</SelectItem>
                      <SelectItem value="roles">Roles</SelectItem>
                      <SelectItem value="role_permissions">
                        Permissions
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[200px] flex-1">
                  <p className="text-muted-foreground mb-1.5 ml-1 text-xs font-medium tracking-wider uppercase">
                    Action Type
                  </p>
                  <Select
                    value={selectedAction}
                    onValueChange={(val) => {
                      setSelectedAction(val);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="CREATE">Create</SelectItem>
                      <SelectItem value="UPDATE">Update</SelectItem>
                      <SelectItem value="DELETE">Delete</SelectItem>
                      <SelectItem value="READ">Read</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex h-full items-end pt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedModule('all');
                      setSelectedAction('all');
                      setPage(1);
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      {isVisible('date_time') && (
                        <TableHead className="w-[180px]">Date & Time</TableHead>
                      )}
                      {isVisible('actor') && (
                        <TableHead className="w-[180px]">Actor</TableHead>
                      )}
                      {isVisible('module') && (
                        <TableHead className="w-[120px]">Module</TableHead>
                      )}
                      {isVisible('action') && (
                        <TableHead className="w-[120px]">Action</TableHead>
                      )}
                      {isVisible('entity') && <TableHead>Entity</TableHead>}
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
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
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
                            <p className="text-muted-foreground text-sm">
                              Loading logs...
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
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
                                  {format(new Date(log.created_at), 'HH:mm:ss')}
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
                          <TableCell className="text-right">
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
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-muted/20 flex items-center justify-between border-t px-4 py-4">
                  <p className="text-muted-foreground text-xs">
                    Showing {logs.length} of {count} logs
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || isLoading}
                    >
                      Previous
                    </Button>
                    <span className="text-xs font-medium">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages || isLoading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageBody>

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
