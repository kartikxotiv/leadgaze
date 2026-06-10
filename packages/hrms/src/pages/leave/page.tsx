'use client';

import type { ReactNode } from 'react';

import { Plus } from 'lucide-react';

import { Card, CardContent } from '@kit/ui/card';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { Input } from '@kit/ui/input';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader } from '@kit/ui/page';
import { TableStatusMetricTab } from '@kit/ui/table-status-metric-tab';
import { Tabs } from '@kit/ui/tabs';

import { HolidayDialog } from '../../components/leave/holiday-dialog';
import { LeaveBalancesGrid } from '../../components/leave/leave-balances-grid';
import {
  LeaveHolidaysTab,
  LeaveTypesTab,
} from '../../components/leave/leave-configuration-tabs';
import { LeaveReportsTab } from '../../components/leave/leave-reports-tab';
import { LeaveRequestDialog } from '../../components/leave/leave-request-dialog';
import {
  LeaveApprovalsTab,
  LeaveRequestsTab,
} from '../../components/leave/leave-request-tabs';
import { LeaveTypeDialog } from '../../components/leave/leave-type-dialog';
import type { LeaveTab } from '../../hooks/use-leave-page';
import { useLeavePage } from '../../hooks/use-leave-page';

export function LeavePage(props: {
  headerActions?: ReactNode;
  workspaceName?: string;
}) {
  const page = useLeavePage();
  const canShowRequests = page.availableTabs.includes('requests');
  const canShowApprovals = page.availableTabs.includes('approvals');
  const canShowHolidays = page.availableTabs.includes('holidays');
  const canShowTypes = page.availableTabs.includes('types');
  const canShowReports = page.availableTabs.includes('reports');

  const primaryAction =
    page.activeTab === 'requests' && page.permissions.canApply
      ? {
          label: 'Apply Leave',
          onClick: () => page.onRequestDialogOpenChange(true),
        }
      : page.activeTab === 'holidays' && page.permissions.canManageHolidays
        ? {
            label: 'Add Holiday',
            onClick: page.openCreateHolidayDialog,
          }
        : page.activeTab === 'types' && page.permissions.canManageLeaveTypes
          ? {
              label: 'New Leave Type',
              onClick: page.openCreateTypeDialog,
            }
          : null;

  const activeCount = getLeaveTabCount(page, page.activeTab);

  return (
    <section className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col">
      <div className="flex w-full min-w-0 max-w-full shrink-0 flex-col">
        <PageHeader
          title={`Leave (${activeCount})`}
          description={
            props.workspaceName
              ? `${props.workspaceName} leave operations`
              : 'Leave operations'
          }
        >
          {props.headerActions}
        </PageHeader>

        {!page.isRbacLoading && page.availableTabs.length > 0 ? (
          <>
            <div className="w-full min-w-0 max-w-full overflow-x-auto pb-2">
              <div className="flex flex-wrap items-center gap-2">
                {page.availableTabs.map((tab) => (
                  <TableStatusMetricTab
                    key={tab}
                    id={tab}
                    color={getLeaveTabColor(tab)}
                    statusName={getLeaveTabLabel(tab)}
                    count={getLeaveTabCount(page, tab)}
                    isSelected={page.activeTab === tab}
                    onClick={() => page.setActiveTab(tab)}
                  />
                ))}
              </div>
            </div>

            {primaryAction ? (
              <div className="w-full min-w-0 max-w-full shrink-0 border-b pb-2">
                <ListToolBar
                  actions={[
                    {
                      key: 'primary',
                      label: primaryAction.label,
                      icon: Plus,
                      onClick: primaryAction.onClick,
                      show: true,
                      buttonVariant: 'default',
                    },
                  ]}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <PageBody className="bg-sidebar sticky flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col pt-3">
        <div className="flex w-full min-w-0 max-w-full flex-col gap-4 pb-6">
          {!page.isRbacLoading && page.availableTabs.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground p-6 text-sm">
                You do not have permission to access the Leave module.
              </CardContent>
            </Card>
          ) : (
            <>
              <CardWidgetContainer
                title="Leave Year"
                desc="Review balances, approvals, holidays, and reports for the selected year."
                contentClassName="hidden"
                icon2={
                  <Input
                    className="h-9 w-full sm:w-32"
                    min={2020}
                    type="number"
                    value={page.selectedYear}
                    onChange={(event) =>
                      page.setSelectedYear(
                        Number(event.target.value || new Date().getFullYear()),
                      )
                    }
                  />
                }
              >
                <div />
              </CardWidgetContainer>

              <LeaveBalancesGrid balances={page.balances} />

              <Tabs
                value={page.activeTab}
                onValueChange={(value) => page.setActiveTab(value as LeaveTab)}
              >
                {canShowRequests ? (
                  <LeaveRequestsTab
                    requests={page.myRequests}
                    selectedYear={page.selectedYear}
                    updatePending={page.updateLeaveRequestPending}
                    onUpdateRequest={page.updateLeaveRequest}
                  />
                ) : null}

                {canShowApprovals ? (
                  <LeaveApprovalsTab
                    requests={page.approvalRequests}
                    selectedYear={page.selectedYear}
                    updatePending={page.updateLeaveRequestPending}
                    onUpdateRequest={page.updateLeaveRequest}
                  />
                ) : null}

                {canShowHolidays ? (
                  <LeaveHolidaysTab
                    holidays={page.holidays}
                    canManageHolidays={page.permissions.canManageHolidays}
                    deletePending={page.deleteHolidayPending}
                    onDeleteHoliday={page.deleteHoliday}
                    onEditHoliday={page.openEditHolidayDialog}
                  />
                ) : null}

                {canShowTypes ? (
                  <LeaveTypesTab
                    canManageLeaveTypes={page.permissions.canManageLeaveTypes}
                    deletePending={page.deleteLeaveTypePending}
                    leaveTypes={page.leaveTypes}
                    onDeleteLeaveType={page.deleteLeaveType}
                    onEditLeaveType={page.openEditTypeDialog}
                  />
                ) : null}

                {canShowReports ? (
                  <LeaveReportsTab reports={page.reports} />
                ) : null}
              </Tabs>

              {page.dashboardQuery.isLoading ? (
                <Card>
                  <CardContent className="text-muted-foreground p-6 text-sm">
                    Loading leave data...
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </div>
      </PageBody>

      {page.permissions.canApply ? (
        <LeaveRequestDialog
          open={page.isRequestDialogOpen}
          onOpenChange={page.onRequestDialogOpenChange}
          onSubmit={page.submitLeaveRequest}
          isPending={page.createLeaveRequestPending}
          leaveTypes={page.leaveTypes}
        />
      ) : null}
      {page.permissions.canManageLeaveTypes ? (
        <LeaveTypeDialog
          open={page.isTypeDialogOpen}
          onOpenChange={page.onTypeDialogOpenChange}
          onSubmit={page.submitType}
          isPending={page.createLeaveTypePending}
          leaveType={page.editingType}
        />
      ) : null}
      {page.permissions.canManageHolidays ? (
        <HolidayDialog
          open={page.isHolidayDialogOpen}
          onOpenChange={page.onHolidayDialogOpenChange}
          onSubmit={page.submitHoliday}
          isPending={page.createLeaveHolidayPending}
          holiday={page.editingHoliday}
        />
      ) : null}
    </section>
  );
}

function getLeaveTabCount(
  page: ReturnType<typeof useLeavePage>,
  tab: LeaveTab,
) {
  if (tab === 'requests') {
    return page.myRequests.length;
  }

  if (tab === 'approvals') {
    return page.approvalRequests.length;
  }

  if (tab === 'holidays') {
    return page.holidays.length;
  }

  if (tab === 'types') {
    return page.leaveTypes.length;
  }

  return page.reports?.summary.total ?? 0;
}

function getLeaveTabLabel(tab: LeaveTab) {
  if (tab === 'requests') {
    return 'Requests';
  }

  if (tab === 'approvals') {
    return 'Approvals';
  }

  if (tab === 'holidays') {
    return 'Holidays';
  }

  if (tab === 'types') {
    return 'Leave Types';
  }

  return 'Reports';
}

function getLeaveTabColor(tab: LeaveTab) {
  const colors = {
    approvals: '#f59e0b',
    holidays: '#6366f1',
    reports: '#8b5cf6',
    requests: '#4eacff',
    types: '#22c55e',
  } as const;

  return colors[tab];
}
