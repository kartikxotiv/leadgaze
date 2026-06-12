'use client';

import { type ReactNode, useState } from 'react';

import { LifeBuoy } from 'lucide-react';

import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Skeleton } from '@kit/ui/skeleton';
import { TableStatusMetricTab } from '@kit/ui/table-status-metric-tab';
import { Tabs } from '@kit/ui/tabs';

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

type SelfServiceTab = 'payslips' | 'requests';

export function SelfServicePage(props: {
  headerActions?: ReactNode;
  workspaceName?: string;
}) {
  const { hasPermission, isLoading: isRbacLoading } = useRbac();
  const canViewSelfService = hasPermission('self_service', 'view', 'own');
  const page = useSelfServicePage({ enabled: canViewSelfService });
  const [activeTab, setActiveTab] = useState<SelfServiceTab>('payslips');
  const dashboardData = page.dashboardData;
  const activeCount =
    activeTab === 'payslips'
      ? (dashboardData?.payslips.length ?? 0)
      : (dashboardData?.requests.length ?? 0);

  return (
    <>
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden">
        <PageHeader
          title={`Self Service (${activeCount})`}
          description={
            props.workspaceName
              ? `${props.workspaceName} employee self-service`
              : 'Employee self-service'
          }
        >
          {props.headerActions}
        </PageHeader>
      </div>

        {!isRbacLoading && canViewSelfService ? (
          <>
            <div className="w-full max-w-full min-w-0 overflow-x-auto pb-2 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <TableStatusMetricTab
                  id="payslips"
                  color="#4eacff"
                  statusName="Payslips"
                  count={dashboardData?.payslips.length ?? 0}
                  isSelected={activeTab === 'payslips'}
                  onClick={() => setActiveTab('payslips')}
                />
                <TableStatusMetricTab
                  id="requests"
                  color="#22c55e"
                  statusName="HR Requests"
                  count={dashboardData?.requests.length ?? 0}
                  isSelected={activeTab === 'requests'}
                  onClick={() => setActiveTab('requests')}
                />
                <TableStatusMetricTab
                  id="announcements"
                  color="#f59e0b"
                  statusName="Announcements"
                  count={dashboardData?.announcements.length ?? 0}
                  className="cursor-default"
                />
                {/* <TableStatusMetricTab
                  id="profile"
                  color="#8b5cf6"
                  statusName="Profile Completion"
                  count={dashboardData?.metrics.profileCompletion ?? 0}
                  className="cursor-default"
                /> */}
              </div>
            </div>

            {activeTab === 'requests' &&
            dashboardData?.permissions.canCreateRequest ? (
              <div className="w-full max-w-full min-w-0 shrink-0 border-b pb-2">
                <ListToolBar
                  actions={[
                    {
                      key: 'request',
                      label: 'Raise Request',
                      icon: LifeBuoy,
                      onClick: () => page.setIsRequestDialogOpen(true),
                      show: true,
                      buttonVariant: 'default',
                    },
                  ]}
                />
              </div>
            ) : null}
          </>
        ) : null}
      

      <PageBody className="sticky flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-2 overflow-y-auto">
          {!isRbacLoading && !canViewSelfService ? (
            <SelfServiceAccessCard />
          ) : page.dashboardQuery.isLoading || isRbacLoading ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-32 rounded-lg" />
                ))}
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <Skeleton className="h-[360px] rounded-lg" />
                <Skeleton className="h-[360px] rounded-lg" />
              </div>
            </>
          ) : page.dashboardQuery.isError || !dashboardData ? (
            <CardWidgetContainer
              title="Unable to load self service"
              desc={
                (page.dashboardQuery.error as Error)?.message ??
                'Something went wrong while loading your self-service workspace.'
              }
              contentClassName="hidden"
            >
              <div />
            </CardWidgetContainer>
          ) : (
            <>
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

              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as SelfServiceTab)}
              >
                <SelfServicePayslipsTab
                  canDownload={dashboardData.permissions.canDownloadPayslip}
                  onDownload={page.handleDownloadPayslip}
                  onView={page.openPayslipDetails}
                  payslips={dashboardData.payslips}
                />

                <SelfServiceRequestsTab requests={dashboardData.requests} />
              </Tabs>
            </>
          )}
        </div>
      </PageBody>

      {dashboardData ? (
        <>
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
        </>
      ) : null}
    </>
  );
}
