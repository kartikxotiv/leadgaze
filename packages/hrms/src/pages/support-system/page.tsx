'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Skeleton } from '@kit/ui/skeleton';

import { useRbac } from '../../components/rbac/rbac-context';
import { useSupportSystemPage } from '../../hooks/use-support-system-page';
import {
  SupportRequestUpdateDialog,
  SupportSystemAccessCard,
  SupportSystemMetricCards,
  SupportSystemRequestsCard,
} from './page.components';

export function SupportSystemPage() {
  const { hasPermission, isLoading: isRbacLoading } = useRbac();
  const canViewSupportSystem = hasPermission('support_system', 'view', 'team');
  const canUpdateSupportSystem = hasPermission(
    'support_system',
    'update',
    'team',
  );
  const page = useSupportSystemPage({ enabled: canViewSupportSystem });

  if (!isRbacLoading && !canViewSupportSystem) {
    return <SupportSystemAccessCard />;
  }

  if (page.dashboardQuery.isLoading || isRbacLoading) {
    return (
      <section className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[420px] rounded-xl" />
      </section>
    );
  }

  if (page.dashboardQuery.isError || !page.dashboardData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load support system</CardTitle>
          <CardDescription>
            {(page.dashboardQuery.error as Error)?.message ??
              'Something went wrong while loading support requests.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <SupportSystemMetricCards items={page.dashboardData.metrics} />
      <SupportSystemRequestsCard
        activeTab={page.activeTab}
        canUpdate={canUpdateSupportSystem}
        onTabChange={page.setActiveTab}
        onUpdate={page.openUpdateDialog}
        requests={page.requests}
      />

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
