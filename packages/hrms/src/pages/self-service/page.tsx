'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Skeleton } from '@kit/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@kit/ui/tabs';

import { useRbac } from '../../components/rbac/rbac-context';
import { useSelfServicePage } from '../../hooks/use-self-service-page';
import {
  SelfServiceAccessCard,
  SelfServiceAnnouncementsCard,
  SelfServiceMetricCards,
  SelfServiceProfileCard,
} from './page.cards';
import {
  CreateRequestDialog,
  SelfServicePayslipDetailsDialog,
  UpdateProfileDialog,
} from './page.dialogs';
import { SelfServicePayslipsTab, SelfServiceRequestsTab } from './page.tabs';

export function SelfServicePage() {
  const { hasPermission, isLoading: isRbacLoading } = useRbac();
  const canViewSelfService = hasPermission('self_service', 'view', 'own');
  const page = useSelfServicePage({ enabled: canViewSelfService });

  if (!isRbacLoading && !canViewSelfService) {
    return <SelfServiceAccessCard />;
  }

  if (page.dashboardQuery.isLoading || isRbacLoading) {
    return (
      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-[360px] rounded-lg" />
          <Skeleton className="h-[360px] rounded-lg" />
        </div>
      </section>
    );
  }

  if (page.dashboardQuery.isError || !page.dashboardData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load self service</CardTitle>
          <CardDescription>
            {(page.dashboardQuery.error as Error)?.message ??
              'Something went wrong while loading your self-service workspace.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { dashboardData } = page;

  return (
    <section className="space-y-4">
      <SelfServiceMetricCards metrics={dashboardData.metrics} />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SelfServiceProfileCard
          canEdit={dashboardData.permissions.canUpdateProfile}
          employee={dashboardData.employee}
          onEdit={() => page.setIsProfileDialogOpen(true)}
        />
        <SelfServiceAnnouncementsCard
          announcements={dashboardData.announcements}
        />
      </div>

      <Tabs defaultValue="payslips">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
          <TabsTrigger value="requests">HR Requests</TabsTrigger>
        </TabsList>

        <SelfServicePayslipsTab
          canDownload={dashboardData.permissions.canDownloadPayslip}
          onDownload={page.handleDownloadPayslip}
          onView={page.openPayslipDetails}
          payslips={dashboardData.payslips}
        />

        <SelfServiceRequestsTab
          canCreateRequest={dashboardData.permissions.canCreateRequest}
          onRaiseRequest={() => page.setIsRequestDialogOpen(true)}
          requests={dashboardData.requests}
        />
      </Tabs>

      <UpdateProfileDialog
        employee={dashboardData.employee}
        isPending={page.updateProfileMutation.isPending}
        open={page.isProfileDialogOpen}
        onOpenChange={page.setIsProfileDialogOpen}
        onSubmit={(payload) => page.updateProfileMutation.mutate(payload)}
      />

      <CreateRequestDialog
        isPending={page.createRequestMutation.isPending}
        open={page.isRequestDialogOpen}
        onOpenChange={page.setIsRequestDialogOpen}
        onSubmit={(payload) => page.createRequestMutation.mutate(payload)}
      />

      <SelfServicePayslipDetailsDialog
        canDownload={dashboardData.permissions.canDownloadPayslip}
        open={page.isPayslipDialogOpen}
        payslipId={page.selectedPayslip?.id ?? null}
        onDownload={page.handleDownloadPayslip}
        onOpenChange={page.setIsPayslipDialogOpen}
      />
    </section>
  );
}
