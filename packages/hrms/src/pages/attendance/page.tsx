'use client';

import type { ReactNode } from 'react';

import { Plus } from 'lucide-react';

import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader } from '@kit/ui/page';
import { TableStatusMetricTab } from '@kit/ui/table-status-metric-tab';

import { EMPTY_ATTENDANCE_SUMMARY } from '../../attendance-page.utils';
import { AttendanceRecordDialog } from '../../components/attendance/attendance-record-dialog';
import { MyAttendanceCard } from '../../components/attendance/my-attendance-card';
import { RecentAttendanceCard } from '../../components/attendance/recent-attendance-card';
import { ShiftFormDialog } from '../../components/attendance/shift-form-dialog';
import { ShiftsTableCard } from '../../components/attendance/shifts-table-card';
import { TeamAttendanceTableCard } from '../../components/attendance/team-attendance-table-card';
import { WorkingDaysCard } from '../../components/attendance/working-days-card';
import { useAttendancePage } from '../../hooks/use-attendance-page';

export function AttendancePage(props: {
  headerActions?: ReactNode;
  workspaceName?: string;
}) {
  const {
    activeView,
    adminData,
    adminAttendanceQuery,
    allAttendanceShifts,
    allAttendanceStatuses,
    attendanceSettingsQuery,
    canApprove,
    canManageShifts,
    canViewTeam,
    checkInMutation,
    checkOutMutation,
    deleteShift,
    dialogShifts,
    editingRow,
    editingShift,
    filterableAttendanceShifts,
    hasAttendanceFilters,
    isEditDialogOpen,
    isMemberOnlyView,
    isShiftDialogOpen,
    markRowAbsent,
    markRowPresent,
    myData,
    onEditDialogOpenChange,
    onShiftDialogOpenChange,
    openCreateShiftDialog,
    openEditDialog,
    openEditShiftDialog,
    pendingRecordSave,
    pendingShiftSave,
    pendingWorkingDaysSave,
    resetAttendanceFilters,
    resetWorkingDays,
    searchTerm,
    selectedDate,
    selectedDateLabel,
    setActiveView,
    setAttendanceSearchTerm,
    setSelectedDate,
    setShiftFilter,
    setStatusFilter,
    shiftFilter,
    shifts,
    shiftsQuery,
    statusFilter,
    submitRecord,
    submitShift,
    submitWorkingDays,
    workingDays,
  } = useAttendancePage();
  const summary = adminData?.summary ?? EMPTY_ATTENDANCE_SUMMARY;
  const showTeamFilters = !isMemberOnlyView && activeView === 'team';
  const canShowTeamView = !isMemberOnlyView && canViewTeam;
  const canShowShiftView = !isMemberOnlyView && canManageShifts;
  const activeFilterCount =
    (statusFilter !== allAttendanceStatuses ? 1 : 0) +
    (shiftFilter !== allAttendanceShifts ? 1 : 0);

  return (
    <>
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden">
        <PageHeader
          className="bg-sidebar shrink-0"
          title={`Attendance (${getAttendanceCount({
            activeView,
            recentCount: myData?.recent.length ?? 0,
            shiftsCount: shifts.length,
            teamTotal: summary.total,
          })})`}
          description={
            props.workspaceName
              ? `${props.workspaceName} attendance`
              : 'Attendance'
          }
        >
          {props.headerActions}
        </PageHeader>
      </div>

        <div className="w-full max-w-full min-w-0 overflow-x-auto pb-2 pt-2">
            <div className="flex flex-wrap items-center gap-2">
            {!isMemberOnlyView ? (
              <>
                {canShowTeamView ? (
                  <TableStatusMetricTab
                    id="team"
                    color="#4eacff"
                    statusName="Team"
                    count={summary.total}
                    isSelected={activeView === 'team'}
                    onClick={() => setActiveView('team')}
                  />
                ) : null}
                <TableStatusMetricTab
                  id="my"
                  color="#22c55e"
                  statusName="My Attendance"
                  count={myData?.recent.length ?? 0}
                  isSelected={activeView === 'my'}
                  onClick={() => setActiveView('my')}
                />
                {canShowShiftView ? (
                  <TableStatusMetricTab
                    id="shifts"
                    color="#8b5cf6"
                    statusName="Shifts"
                    count={shifts.length}
                    isSelected={activeView === 'shifts'}
                    onClick={() => setActiveView('shifts')}
                  />
                ) : null}
              </>
            ) : (
              <TableStatusMetricTab
                id="my"
                color="#22c55e"
                statusName="My Attendance"
                count={myData?.recent.length ?? 0}
                isSelected
              />
            )}
          </div>
        </div>

        {showTeamFilters || (activeView === 'shifts' && canManageShifts) ? (
          <div className="w-full max-w-full min-w-0 shrink-0 border-b pb-2">
            <ListToolBar
              showSearch={showTeamFilters}
              searchPlaceholder="Search attendance..."
              searchValue={searchTerm}
              onSearchChange={setAttendanceSearchTerm}
              showFilter={showTeamFilters}
              filterGroups={[
                {
                  key: 'status',
                  label: 'Status',
                  selectedValue:
                    statusFilter === allAttendanceStatuses ? '' : statusFilter,
                  selectedLabel:
                    statusFilter === allAttendanceStatuses
                      ? 'All statuses'
                      : getAttendanceStatusLabel(statusFilter),
                  options: [
                    {
                      value: 'present',
                      label: 'Present',
                      color: '#22c55e',
                    },
                    {
                      value: 'in_progress',
                      label: 'In Progress',
                      color: '#0ea5e9',
                    },
                    {
                      value: 'absent',
                      label: 'Absent',
                      color: '#ef4444',
                    },
                  ],
                  onSelect: (value) =>
                    setStatusFilter(value || allAttendanceStatuses),
                },
                {
                  key: 'shift',
                  label: 'Shift',
                  selectedValue:
                    shiftFilter === allAttendanceShifts ? '' : shiftFilter,
                  selectedLabel:
                    shiftFilter === allAttendanceShifts
                      ? 'All shifts'
                      : (filterableAttendanceShifts.find(
                          (shift) => shift.id === shiftFilter,
                        )?.name ?? '1 selected'),
                  options: filterableAttendanceShifts.map((shift) => ({
                    value: shift.id,
                    label: shift.name,
                  })),
                  onSelect: (value) =>
                    setShiftFilter(value || allAttendanceShifts),
                },
              ]}
              activeFilterCount={activeFilterCount}
              onClearFilters={resetAttendanceFilters}
              actions={[
                {
                  key: 'shift',
                  label: 'New Shift',
                  icon: Plus,
                  onClick: openCreateShiftDialog,
                  show: activeView === 'shifts' && canManageShifts,
                  buttonVariant: 'default',
                },
              ]}
            />
          </div>
        ) : null}
      

      <PageBody className="sticky flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-2 overflow-y-auto">
          <CardWidgetContainer
            title="Selected Date"
            className="border-b-0"
            desc={
              isMemberOnlyView
                ? 'Choose a date to view your attendance.'
                : `${getViewLabel(activeView)} - ${selectedDateLabel}`
            }
            contentClassName="hidden"
            icon2={
              <input
                title="date"
                className="bg-background h-9 border px-3 text-sm"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            }
          >
            <div />
          </CardWidgetContainer>

          {activeView === 'team' ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2 mt-2">
              <div className="w-full min-w-0 max-w-full overflow-x-auto">
                <div className="flex flex-wrap items-center gap-2">
                  <TableStatusMetricTab
                    id="present"
                    color="#22c55e"
                    statusName="Present"
                    count={summary.present}
                    className="cursor-default"
                  />
                  <TableStatusMetricTab
                    id="absent"
                    color="#ef4444"
                    statusName="Absent"
                    count={summary.absent}
                    className="cursor-default"
                  />
                  <TableStatusMetricTab
                    id="in_progress"
                    color="#0ea5e9"
                    statusName="In Progress"
                    count={summary.inProgress}
                    className="cursor-default"
                  />
                  <TableStatusMetricTab
                    id="total"
                    color="#8b5cf6"
                    statusName="Total"
                    count={summary.total}
                    className="cursor-default"
                  />
                </div>
              </div>
              <TeamAttendanceTableCard
                className="min-h-0 flex-1"
                isLoading={adminAttendanceQuery.isLoading}
                rows={adminData?.rows ?? []}
                hasFilters={hasAttendanceFilters}
                onEditRequested={openEditDialog}
                onMarkAbsentRequested={markRowAbsent}
                onMarkPresentRequested={markRowPresent}
                canApprove={canApprove}
              />
            </div>
          ) : null}

          {activeView === 'my' ? (
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <MyAttendanceCard
                date={selectedDate}
                logs={myData?.logs ?? []}
                onCheckIn={() => checkInMutation.mutate()}
                onCheckOut={() => checkOutMutation.mutate()}
                record={myData?.today ?? null}
                isCheckingIn={checkInMutation.isPending}
                isCheckingOut={checkOutMutation.isPending}
                isWorkingDay={myData?.isWorkingDay ?? true}
              />
              <RecentAttendanceCard records={myData?.recent ?? []} />
            </div>
          ) : null}

          {activeView === 'shifts' ? (
            <div className="grid gap-2">
              <WorkingDaysCard
                workingDays={workingDays}
                isLoading={attendanceSettingsQuery.isLoading}
                isPending={pendingWorkingDaysSave}
                onChange={submitWorkingDays}
                onReset={resetWorkingDays}
                canManageShifts={canManageShifts}
              />
              <ShiftsTableCard
                shifts={shifts}
                isLoading={shiftsQuery.isLoading}
                onCreateRequested={openCreateShiftDialog}
                onEditRequested={openEditShiftDialog}
                onDeleteRequested={(shift) => deleteShift(shift.id)}
                canManageShifts={canManageShifts}
              />
            </div>
          ) : null}
        </div>
      </PageBody>

      <AttendanceRecordDialog
        open={isEditDialogOpen}
        onOpenChange={onEditDialogOpenChange}
        onSubmit={submitRecord}
        isPending={pendingRecordSave}
        row={editingRow}
        shifts={dialogShifts}
        date={selectedDateLabel}
      />
      <ShiftFormDialog
        open={isShiftDialogOpen}
        onOpenChange={onShiftDialogOpenChange}
        onSubmit={submitShift}
        isPending={pendingShiftSave}
        shift={editingShift}
      />
    </>
  );
}

function getAttendanceStatusLabel(value: string) {
  if (value === 'present') {
    return 'Present';
  }

  if (value === 'in_progress') {
    return 'In Progress';
  }

  if (value === 'absent') {
    return 'Absent';
  }

  return 'All statuses';
}

function getViewLabel(value: string) {
  if (value === 'team') {
    return 'Team overview';
  }

  if (value === 'shifts') {
    return 'Shift configuration';
  }

  return 'My attendance';
}

function getAttendanceCount(props: {
  activeView: string;
  recentCount: number;
  shiftsCount: number;
  teamTotal: number;
}) {
  if (props.activeView === 'team') {
    return props.teamTotal;
  }

  if (props.activeView === 'shifts') {
    return props.shiftsCount;
  }

  return props.recentCount;
}
