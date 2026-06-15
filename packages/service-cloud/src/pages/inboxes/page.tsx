'use client';

import { CoreEmailInboxPage } from '@kit/core/pages';
import { Skeleton } from '@kit/ui/skeleton';

import {
  SERVICE_CLOUD_FEATURE_KEYS,
  SERVICE_CLOUD_MODULE_KEYS,
  useServiceCloudPermissions,
} from '../../utils';
import { ServiceCloudAccessDenied } from '../_components/access-denied';
import { ServiceCloudEmailToTicketAction } from './email-to-ticket-action';

export function ServiceCloudInboxesPage({ workspace }: { workspace: any }) {
  const { canAccess, isLoading } = useServiceCloudPermissions(workspace?.id);
  const canView = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.inboxes,
    SERVICE_CLOUD_FEATURE_KEYS.view,
  );

  if (isLoading) return <ServiceCloudInboxSkeleton />;
  if (!canView) return <ServiceCloudAccessDenied label="support inboxes" />;

  return (
    <CoreEmailInboxPage
      workspace={workspace}
      embedded
      templateContext={{
        module_name: 'Service Cloud',
        workspace_name: workspace?.name ?? '',
      }}
      renderEmailActions={(email) => (
        <ServiceCloudEmailToTicketAction
          workspaceId={workspace.id}
          email={email}
        />
      )}
      permissions={{
        viewInbox: canView,
        sendEmails: canAccess(
          SERVICE_CLOUD_MODULE_KEYS.tickets,
          SERVICE_CLOUD_FEATURE_KEYS.reply,
        ),
      }}
    />
  );
}

function ServiceCloudInboxSkeleton() {
  return (
    <div className="grid gap-4">
      {/* Filter buttons + inbox selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Skeleton className="h-[38px] w-20 rounded-md" />
          <Skeleton className="h-[38px] w-24 rounded-md" />
          <Skeleton className="h-[38px] w-28 rounded-md" />
        </div>
        <Skeleton className="h-[38px] w-full rounded-md sm:w-[280px]" />
      </div>

      {/* Toolbar row: search + action buttons */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>

      {/* Email list skeleton */}
      <div className="grid gap-3">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="min-w-0 space-y-1.5">
                  <Skeleton className={`h-4 ${i % 3 === 0 ? 'w-56' : i % 2 === 0 ? 'w-72' : 'w-64'}`} />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-1 rounded-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />
            </div>
            <Skeleton className={`h-3 ${i % 2 === 0 ? 'w-full' : 'w-11/12'}`} />
            {i % 3 !== 2 && <Skeleton className="h-3 w-4/5" />}
          </div>
        ))}
      </div>

      {/* Pagination bar */}
      <div className="flex flex-col gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:bg-zinc-900">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}
