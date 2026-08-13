'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CheckSquare,
  Clock,
  File,
  FileText,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  User,
  UserCheck,
} from 'lucide-react';
import { Button } from '@kit/ui/button';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { cn } from '@kit/ui/utils';
import { useLocalization } from '~/lib/localization/localization-provider';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getAuditLogsService } from '~/services/audit-logs.service';

interface EntityActivityLogsProps {
  entityType: string;
  entityId: string;
}

export function EntityActivityLogs({ entityType, entityId }: EntityActivityLogsProps) {
  const { currentWorkspace: workspace } = useRBAC();
  const { formatDateTime } = useLocalization();

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['audit-logs', entityType, entityId, workspace?.id],
    queryFn: () => {
      if (!workspace?.id) return { logs: [], count: 0 };
      return getAuditLogsService({
        workspaceId: workspace.id,
        entityId,
        entityType,
        limit: 100,
      });
    },
    enabled: !!workspace?.id && !!entityId,
  });

  const logs = data?.logs || [];

  const getModuleIcon = (moduleName: string) => {
    switch (moduleName) {
      case 'leads':
        return <User className="h-3.5 w-3.5 text-blue-500" />;
      case 'contacts':
        return <UserCheck className="h-3.5 w-3.5 text-indigo-500" />;
      case 'accounts':
        return <Building2 className="h-3.5 w-3.5 text-emerald-500" />;
      case 'opportunities':
        return <Briefcase className="h-3.5 w-3.5 text-amber-500" />;
      case 'core_emails':
      case 'emails':
        return <Mail className="h-3.5 w-3.5 text-blue-500" />;
      case 'core_notes':
      case 'notes':
        return <FileText className="h-3.5 w-3.5 text-purple-500" />;
      case 'core_meetings':
      case 'meetings':
        return <Calendar className="h-3.5 w-3.5 text-sky-500" />;
      case 'core_reminders':
      case 'reminders':
        return <Bell className="h-3.5 w-3.5 text-orange-500" />;
      case 'core_tasks':
      case 'tasks':
        return <CheckSquare className="h-3.5 w-3.5 text-teal-500" />;
      case 'call_logs':
        return <Phone className="h-3.5 w-3.5 text-green-500" />;
      case 'core_documents':
      case 'documents':
        return <File className="h-3.5 w-3.5 text-gray-500" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action?.toUpperCase()) {
      case 'CREATE':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
            CREATED
          </span>
        );
      case 'UPDATE':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
            UPDATED
          </span>
        );
      case 'DELETE':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
            DELETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300">
            {action}
          </span>
        );
    }
  };

  const getModuleLabel = (moduleName: string) => {
    const map: Record<string, string> = {
      leads: 'Lead',
      contacts: 'Contact',
      accounts: 'Account',
      opportunities: 'Opportunity',
      core_emails: 'Email',
      emails: 'Email',
      core_notes: 'Note',
      notes: 'Note',
      core_meetings: 'Meeting',
      meetings: 'Meeting',
      core_reminders: 'Reminder',
      reminders: 'Reminder',
      core_tasks: 'Task',
      tasks: 'Task',
      core_task_time_logs: 'Time Log',
      call_logs: 'Call',
      core_documents: 'Document',
      documents: 'Document',
    };
    return map[moduleName] || moduleName;
  };

  const formatEntityName = (name: string | null) => {
    if (!name) return '';
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    const cleaned = name.replace(uuidRegex, '').replace(/^#\s*/, '').replace(/\s+Task\s*$/i, '').trim();
    if (cleaned.startsWith('Task #') || cleaned === 'Task' || cleaned === 'Time log:') return name.replace(uuidRegex, '').trim();
    return cleaned;
  };

  return (
    <CardWidgetContainer
      title="Activity"
      headerClassName="p-2 xl:p-2 2xl:p-2"
      icon={<Clock className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
      icon2={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-7 gap-1 px-2 text-xs text-blue-500 hover:text-blue-600"
          title="Refresh activity logs"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          <span>Refresh</span>
        </Button>
      }
    >
      <div className="px-0 mb-2">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        ) : logs.length > 0 ? (
          <div className="max-h-[350px] overflow-y-auto divide-y divide-gray-100 border border-gray-200 bg-white dark:divide-gray-800/60 dark:border-gray-800 dark:bg-slate-950">
            {logs.map((log: any) => {
              const formattedName = formatEntityName(log.entity_name);

              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-1.5 px-3 py-1.5 text-xs transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/60"
                >
                  {/* Left: Icon, Module, Action, Target Entity */}
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <div className="shrink-0">
                      {getModuleIcon(log.module)}
                    </div>
                    <span className="font-semibold text-leadgaze-dark shrink-0 dark:text-white text-xs">
                      {getModuleLabel(log.module)}
                    </span>
                    {getActionBadge(log.action)}
                    {formattedName && (
                      <span className="font-medium text-gray-800 truncate dark:text-gray-200 text-xs">
                        {formattedName}
                      </span>
                    )}
                  </div>

                  {/* Right: Actor, Timestamp */}
                  <div className="flex items-center gap-2 shrink-0 text-xs text-gray-500 dark:text-gray-400">
                    <span>by {log.actor?.name || log.actor?.email || 'System'}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="whitespace-nowrap">{formatDateTime(log.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F3FF]">
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
            <p className="mt-4 text-sm text-gray-500">No activity logs recorded yet</p>
          </div>
        )}
      </div>
    </CardWidgetContainer>
  );
}
