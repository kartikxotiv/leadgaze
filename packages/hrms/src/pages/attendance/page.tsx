'use client';

import { Filter, Plus, Search, X } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import { EMPTY_ATTENDANCE_SUMMARY } from '../../attendance-page.utils';
import { AttendanceRecordDialog } from '../../components/attendance/attendance-record-dialog';
import { AttendanceSummaryCards } from '../../components/attendance/attendance-summary-cards';
import { MyAttendanceCard } from '../../components/attendance/my-attendance-card';
import { RecentAttendanceCard } from '../../components/attendance/recent-attendance-card';
import { ShiftFormDialog } from '../../components/attendance/shift-form-dialog';
import { ShiftsTableCard } from '../../components/attendance/shifts-table-card';
import { TeamAttendanceTableCard } from '../../components/attendance/team-attendance-table-card';
import { WorkingDaysCard } from '../../components/attendance/working-days-card';
import { useAttendancePage } from '../../hooks/use-attendance-page';

export function AttendancePage() {
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
    isFiltersVisible,
    isEditDialogOpen,
    isMemberOnlyView,
    isSearchVisible,
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
    setIsFiltersVisible,
    setIsSearchVisible,
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
  const showTeamFilters = !isMemberOnlyView && activeView === 'team';

  return (
    <section
      className={
        activeView === 'team'
          ? 'flex min-h-0 flex-1 flex-col gap-4'
          : 'flex flex-col gap-4'
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {showTeamFilters ? (
          isSearchVisible ? (
            <div className="relative">
              <Input
                className="h-9 w-full pr-9 sm:w-[320px]"
                placeholder="Search attendance"
                value={searchTerm}
                onChange={(event) =>
                  setAttendanceSearchTerm(event.target.value)
                }
              />
              <Button
                aria-label="Close search"
                className="absolute right-0 top-0 h-9 w-9"
                size="icon"
                variant="ghost"
                onClick={() => {
                  setAttendanceSearchTerm('');
                  setIsSearchVisible(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              aria-label="Search attendance"
              size="icon"
              variant="outline"
              onClick={() => setIsSearchVisible(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
          )
        ) : (
          <div />
        )}

        {!isMemberOnlyView ? (
          <div className="flex gap-2">
            {activeView === 'shifts' && canManageShifts ? (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={openCreateShiftDialog}
                aria-label="Create shift"
              >
                <Plus className="h-4 w-4" />
              </Button>
            ) : null}
            {showTeamFilters ? (
              <Button
                variant={
                  hasAttendanceFilters || isFiltersVisible
                    ? 'default'
                    : 'outline'
                }
                size="icon"
                className="h-9 w-9"
                onClick={() => setIsFiltersVisible((visible) => !visible)}
                aria-pressed={isFiltersVisible}
                aria-label="Filter attendance"
              >
                <Filter className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {showTeamFilters && isFiltersVisible ? (
        <div className="bg-card grid gap-4 rounded-lg border p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <div className="grid gap-2">
            <label
              className="text-sm font-medium"
              htmlFor="attendance-status-filter"
            >
              Status
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="attendance-status-filter">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={allAttendanceStatuses}>
                  All statuses
                </SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label
              className="text-sm font-medium"
              htmlFor="attendance-shift-filter"
            >
              Shift
            </label>
            <Select value={shiftFilter} onValueChange={setShiftFilter}>
              <SelectTrigger id="attendance-shift-filter">
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={allAttendanceShifts}>All shifts</SelectItem>
                {filterableAttendanceShifts.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={resetAttendanceFilters}
            disabled={!hasAttendanceFilters}
          >
            Clear filters
          </Button>
        </div>
      ) : null}

      <div className="bg-card flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium">Selected Date</p>
          <p className="text-muted-foreground text-sm">
            {isMemberOnlyView
              ? 'Choose a date to view your attendance.'
              : 'Use this date for team review and record edits.'}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            title="date"
            className="bg-background h-9 rounded-md border px-3 text-sm"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
          {!isMemberOnlyView && canViewTeam ? (
            <Button
              variant={activeView === 'team' ? 'default' : 'outline'}
              onClick={() => setActiveView('team')}
            >
              Team
            </Button>
          ) : null}
          {!isMemberOnlyView ? (
            <Button
              variant={activeView === 'my' ? 'default' : 'outline'}
              onClick={() => setActiveView('my')}
            >
              My
            </Button>
          ) : null}
          {!isMemberOnlyView && canManageShifts ? (
            <Button
              variant={activeView === 'shifts' ? 'default' : 'outline'}
              onClick={() => setActiveView('shifts')}
            >
              Shifts
            </Button>
          ) : null}
        </div>
      </div>

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

      {activeView === 'team' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="shrink-0">
            <AttendanceSummaryCards
              summary={adminData?.summary ?? EMPTY_ATTENDANCE_SUMMARY}
            />
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

      {activeView === 'shifts' ? (
        <div className="grid gap-4">
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
    </section>
  );
}
