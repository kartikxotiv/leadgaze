'use client';

import { Plus } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Tabs } from '@kit/ui/tabs';

import { HolidayDialog } from '../../components/leave/holiday-dialog';
import { LeaveBalancesGrid } from '../../components/leave/leave-balances-grid';
import {
  LeaveHolidaysTab,
  LeaveTypesTab,
} from '../../components/leave/leave-configuration-tabs';
import { LeavePageControls } from '../../components/leave/leave-page-controls';
import { LeaveReportsTab } from '../../components/leave/leave-reports-tab';
import { LeaveRequestDialog } from '../../components/leave/leave-request-dialog';
import {
  LeaveApprovalsTab,
  LeaveRequestsTab,
} from '../../components/leave/leave-request-tabs';
import { LeaveTypeDialog } from '../../components/leave/leave-type-dialog';
import { useLeavePage } from '../../hooks/use-leave-page';

export function LeavePage() {
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

  if (!page.isRbacLoading && page.availableTabs.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground p-6 text-sm">
          You do not have permission to access the Leave module.
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <LeavePageControls
          activeTab={page.activeTab}
          availableTabs={page.availableTabs}
          onTabChange={page.setActiveTab}
          onYearChange={page.setSelectedYear}
          selectedYear={page.selectedYear}
        />

        {primaryAction ? (
          <Button
            size="sm"
            className="w-full sm:w-auto"
            onClick={primaryAction.onClick}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {primaryAction.label}
          </Button>
        ) : null}
      </div>

      <LeaveBalancesGrid balances={page.balances} />

      <Tabs
        value={page.activeTab}
        onValueChange={(value) =>
          page.setActiveTab(value as typeof page.activeTab)
        }
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

        {canShowReports ? <LeaveReportsTab reports={page.reports} /> : null}
      </Tabs>

      {page.dashboardQuery.isLoading ? (
        <Card>
          <CardContent className="text-muted-foreground p-6 text-sm">
            Loading leave data...
          </CardContent>
        </Card>
      ) : null}

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
