'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, Search, History, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

import { Badge } from '@kit/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@kit/ui/table';
import { Button } from '@kit/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@kit/ui/sheet';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getAuditLogsService } from '~/services/audit-logs.service';
import { ModuleGuard } from '~/lib/rbac/module-guard';

export default function AuditLogsPage() {
    const { currentWorkspace: workspace } = useRBAC();
    const [page, setPage] = useState(1);
    const [selectedModule, setSelectedModule] = useState<string>('all');
    const [selectedAction, setSelectedAction] = useState<string>('all');
    const [selectedLog, setSelectedLog] = useState<any>(null);
    const limit = 50;

    const {
        data,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['audit-logs', workspace?.id, page, selectedModule, selectedAction],
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
            case 'CREATE': return 'text-green-600 bg-green-50 border-green-200';
            case 'UPDATE': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'DELETE': return 'text-red-600 bg-red-50 border-red-200';
            case 'READ': return 'text-gray-600 bg-gray-50 border-gray-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getModuleLabel = (module: string) => {
        return module.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <ModuleGuard module="audit_logs">
            <PageHeader
                title="Audit Logs"
                description="Track all activities and changes within your workspace"
            >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <History className="h-4 w-4" />
                    <span>{count} total events logged</span>
                </div>
            </PageHeader>

            <PageBody>
                <div className="space-y-6">
                    {/* Filters */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex-1 min-w-[200px]">
                                    <p className="text-xs font-medium mb-1.5 ml-1 text-muted-foreground uppercase tracking-wider">Module</p>
                                    <Select
                                        value={selectedModule}
                                        onValueChange={(val) => { setSelectedModule(val); setPage(1); }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Modules" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Modules</SelectItem>
                                            <SelectItem value="leads">Leads</SelectItem>
                                            <SelectItem value="contacts">Contacts</SelectItem>
                                            <SelectItem value="accounts">Accounts</SelectItem>
                                            <SelectItem value="opportunities">Opportunities</SelectItem>
                                            <SelectItem value="team_members">Team Members</SelectItem>
                                            <SelectItem value="roles">Roles</SelectItem>
                                            <SelectItem value="role_permissions">Permissions</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex-1 min-w-[200px]">
                                    <p className="text-xs font-medium mb-1.5 ml-1 text-muted-foreground uppercase tracking-wider">Action Type</p>
                                    <Select
                                        value={selectedAction}
                                        onValueChange={(val) => { setSelectedAction(val); setPage(1); }}
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

                                <div className="flex items-end h-full pt-6">
                                    <Button variant="outline" onClick={() => {
                                        setSelectedModule('all');
                                        setSelectedAction('all');
                                        setPage(1);
                                    }}>
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
                                            <TableHead className="w-[180px]">Date & Time</TableHead>
                                            <TableHead className="w-[180px]">Actor</TableHead>
                                            <TableHead className="w-[120px]">Module</TableHead>
                                            <TableHead className="w-[120px]">Action</TableHead>
                                            <TableHead>Entity</TableHead>
                                            <TableHead className="text-right">Details</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-32 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                                        <p className="text-sm text-muted-foreground">Loading logs...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : logs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-32 text-center">
                                                    <p className="text-muted-foreground">No audit logs found matching your criteria.</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            logs.map((log: any) => (
                                                <TableRow key={log.id} className="group transition-colors hover:bg-muted/30">
                                                    <TableCell className="text-xs font-medium">
                                                        <div className="flex flex-col">
                                                            <span>{format(new Date(log.created_at), 'MMM d, yyyy')}</span>
                                                            <span className="text-muted-foreground font-normal">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                                {log.actor?.name?.[0] || log.actor?.email?.[0] || '?'}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-xs font-medium truncate">{log.actor?.name || 'System'}</span>
                                                                <span className="text-[10px] text-muted-foreground truncate">{log.actor?.email}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-[10px] font-medium capitalize py-0">
                                                            {getModuleLabel(log.module)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={`text-[10px] font-bold px-2 py-0 border ${getActionColor(log.action)}`}
                                                        >
                                                            {log.action}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-medium truncate max-w-[200px]">{log.entity_name || '-'}</span>
                                                            <span className="text-[10px] text-muted-foreground font-mono truncate">{log.entity_id.split('-')[0]}...</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
                                <div className="flex items-center justify-between px-4 py-4 border-t bg-muted/20">
                                    <p className="text-xs text-muted-foreground">
                                        Showing {logs.length} of {count} logs
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1 || isLoading}
                                        >
                                            Previous
                                        </Button>
                                        <span className="text-xs font-medium">Page {page} of {totalPages}</span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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

            <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <SheetContent className="sm:max-w-[500px] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Transaction Details</SheetTitle>
                        <SheetDescription>
                            Full audit data for this event
                        </SheetDescription>
                    </SheetHeader>

                    {selectedLog && (
                        <div className="mt-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase">Action</p>
                                    <Badge className={`mt-1 font-bold ${getActionColor(selectedLog.action)}`}>
                                        {selectedLog.action}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase">Module</p>
                                    <p className="mt-1 text-sm font-semibold">{getModuleLabel(selectedLog.module)}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase">Entity</p>
                                <p className="mt-1 text-sm font-semibold">{selectedLog.entity_name || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground font-mono">{selectedLog.entity_id}</p>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Data States</p>
                                <div className="space-y-4">
                                    {selectedLog.old_data && (
                                        <div>
                                            <p className="text-[10px] font-bold text-red-500 uppercase mb-1">Previous State (Old)</p>
                                            <div className="rounded bg-slate-950 p-3 overflow-x-auto border border-red-500/20">
                                                <pre className="text-[11px] text-slate-300 font-mono leading-relaxed">
                                                    {JSON.stringify(selectedLog.old_data, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    )}

                                    {selectedLog.new_data && (
                                        <div>
                                            <p className="text-[10px] font-bold text-green-500 uppercase mb-1">New State (Changes)</p>
                                            <div className="rounded bg-slate-950 p-3 overflow-x-auto border border-green-500/20">
                                                <pre className="text-[11px] text-slate-300 font-mono leading-relaxed">
                                                    {JSON.stringify(selectedLog.new_data, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    )}

                                    {!selectedLog.old_data && !selectedLog.new_data && (
                                        <p className="text-sm text-muted-foreground italic">No detailed data captured for this action.</p>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                    {selectedLog.actor?.name?.[0] || selectedLog.actor?.email?.[0] || '?'}
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{selectedLog.actor?.name || 'System'}</p>
                                    <p className="text-xs text-muted-foreground">{selectedLog.actor?.email}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </ModuleGuard>
    );
}
