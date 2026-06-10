'use client';

import type { ReactNode } from 'react';

import { Card, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Skeleton } from '@kit/ui/skeleton';
import { TableStatusMetricTab } from '@kit/ui/table-status-metric-tab';

import { useRbac } from '../../components/rbac/rbac-context';
import { useSupportSystemPage } from '../../hooks/use-support-system-page';
import {
  SupportRequestUpdateDialog,
  SupportSystemAccessCard,
  SupportSystemMetricCards,
  SupportSystemRequestsCard,
} from './page.components';
import { SUPPORT_SYSTEM_TABS, getSupportTabRequests } from './page.data';

export function SupportSystemPage(props: {
  headerActions?: ReactNode;
  workspaceName?: string;
}) {
  const { hasPermission, isLoading: isRbacLoading } = useRbac();
  const canViewSupportSystem = hasPermission('support_system', 'view', 'team');
  const canUpdateSupportSystem = hasPermission(
    'support_system',
    'update',
    'team',
  );
  const page = useSupportSystemPage({ enabled: canViewSupportSystem });
  const requests = page.dashboardData?.requests ?? [];
  const activeCount = getSupportTabRequests(requests, page.activeTab).length;

  return (
    <section className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col overflow-hidden">
        <PageHeader
          title={`Support System (${activeCount})`}
          description={
            props.workspaceName
              ? `${props.workspaceName} HR support queue`
              : 'HR support queue'
          }
        >
          {props.headerActions}
        </PageHeader>

        {!isRbacLoading && canViewSupportSystem ? (
          <div className="w-full max-w-full min-w-0 overflow-x-auto pb-2">
            <div className="flex flex-wrap items-center gap-2">
              {SUPPORT_SYSTEM_TABS.map((tab) => (
                <TableStatusMetricTab
                  key={tab.value}
                  id={tab.value}
                  color={getSupportTabColor(tab.value)}
                  statusName={tab.label}
                  count={getSupportTabRequests(requests, tab.value).length}
                  isSelected={page.activeTab === tab.value}
                  onClick={() => page.setActiveTab(tab.value)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <PageBody className="bg-sidebar sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden pt-3">
        <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col gap-4 overflow-y-auto pb-6">
          {!isRbacLoading && !canViewSupportSystem ? (
            <SupportSystemAccessCard />
          ) : page.dashboardQuery.isLoading || isRbacLoading ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-32 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-[420px] rounded-xl" />
            </>
          ) : page.dashboardQuery.isError || !page.dashboardData ? (
            <Card>
              <CardHeader>
                <CardTitle>Unable to load support system</CardTitle>
                <CardDescription>
                  {(page.dashboardQuery.error as Error)?.message ??
                    'Something went wrong while loading support requests.'}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              <SupportSystemMetricCards items={page.dashboardData.metrics} />
              <SupportSystemRequestsCard
                activeTab={page.activeTab}
                canUpdate={canUpdateSupportSystem}
                onTabChange={page.setActiveTab}
                onUpdate={page.openUpdateDialog}
                requests={page.requests}
              />
            </>
          )}
        </div>
      </PageBody>

      <SupportRequestUpdateDialog
        isPending={page.updateRequestMutation.isPending}
        open={page.isUpdateDialogOpen}
        request={page.selectedRequest}
        onOpenChange={page.setIsUpdateDialogOpen}
        onSubmit={(payload) => {
          if (!page.selectedRequest) {
            return;
          }

          page.updateRequestMutation.mutate({
            payload,
            requestId: page.selectedRequest.id,
          });
        }}
      />
    </section>
  );
}

function getSupportTabColor(
  value: (typeof SUPPORT_SYSTEM_TABS)[number]['value'],
) {
  const colors = {
    all: '#4eacff',
    in_progress: '#f59e0b',
    open: '#22c55e',
    resolved: '#8b5cf6',
  } as const;

  return colors[value];
}
