'use client';

import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type AttendanceView,
  formatHeaderDate,
  toISODateString,
} from '../attendance-page.utils';
import { showToast } from '../components/global/ToastAlert';
import { useRbac } from '../components/rbac/rbac-context';
import {
  checkInService,
  checkOutService,
  getAdminAttendanceService,
  getAttendanceSettingsService,
  getMyAttendanceService,
  updateAttendanceRecordService,
  updateWorkingDaysService,
  upsertAttendanceRecordService,
} from '../server/services/attendance.service';
import {
  createShiftService,
  deleteShiftService,
  listShiftsService,
  updateShiftService,
} from '../server/services/shift.service';
import type {
  AdminAttendanceFilters,
  AdminAttendanceResponse,
  AdminAttendanceRow,
  AttendanceDisplayStatus,
  MyAttendanceResponse,
  WorkingDay,
} from '../types/attendance.type';
import type { Shift, ShiftFormPayload } from '../types/shift.type';
import { handleApiResponse } from '../utils/api-response-handler';

const shiftsKey = ['shifts'];
const attendanceSettingsKey = ['attendance-settings'];

const myAttendanceKey = (date: string) => ['attendance-my', date];
const adminAttendanceKey = (
  date: string,
  filters: Omit<AdminAttendanceFilters, 'date'>,
) => ['attendance-admin', date, filters];
const allAttendanceStatuses = 'all';
const allAttendanceShifts = 'all';

type AttendanceRecordMutationPayload = {
  check_in?: string | null;
  check_out?: string | null;
  shift_id?: string | null;
  status?: 'present' | 'absent';
};

function useAttendancePage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() =>
    toISODateString(new Date()),
  );
  const [activeView, setActiveView] = useState<AttendanceView>('my');
  const [editingRow, setEditingRow] = useState<AdminAttendanceRow | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    AttendanceDisplayStatus | typeof allAttendanceStatuses
  >(allAttendanceStatuses);
  const [shiftFilter, setShiftFilter] = useState(allAttendanceShifts);

  const { hasPermission } = useRbac();

  const canLog = hasPermission('attendance', 'log', 'own');
  const canViewTeam = hasPermission('attendance', 'view', 'team');
  const canApprove = hasPermission('attendance', 'approve', 'team');
  const canManageShifts = hasPermission('attendance', 'create', 'team');

  const isAdmin = canViewTeam || canApprove || canManageShifts;
  const isMemberOnlyView = !isAdmin;
  const normalizedSearchTerm = searchTerm.trim();

  const adminFilters = useMemo<Omit<AdminAttendanceFilters, 'date'>>(
    () => ({
      search: normalizedSearchTerm || undefined,
      shiftId: shiftFilter === allAttendanceShifts ? undefined : shiftFilter,
      status: statusFilter === allAttendanceStatuses ? undefined : statusFilter,
    }),
    [normalizedSearchTerm, shiftFilter, statusFilter],
  );

  const hasAttendanceFilters =
    Boolean(normalizedSearchTerm) ||
    statusFilter !== allAttendanceStatuses ||
    shiftFilter !== allAttendanceShifts;

  useEffect(() => {
    if (isMemberOnlyView && activeView !== 'my') {
      setActiveView('my');
    }
  }, [activeView, isMemberOnlyView]);

  const myAttendanceQuery = useQuery({
    queryKey: myAttendanceKey(selectedDate),
    queryFn: () => getMyAttendanceService(selectedDate),
    enabled: canLog,
  });

  const adminAttendanceQuery = useQuery({
    queryKey: adminAttendanceKey(selectedDate, adminFilters),
    queryFn: () =>
      getAdminAttendanceService({
        date: selectedDate,
        ...adminFilters,
      }),
    enabled: isAdmin && activeView === 'team',
  });

  const shiftsQuery = useQuery({
    queryKey: shiftsKey,
    queryFn: listShiftsService,
    enabled: isAdmin && activeView === 'shifts',
  });

  const attendanceSettingsQuery = useQuery({
    queryKey: attendanceSettingsKey,
    queryFn: getAttendanceSettingsService,
    enabled: isAdmin && activeView === 'shifts',
  });

  const invalidateAttendanceData = async () => {
    await queryClient.invalidateQueries({
      queryKey: myAttendanceKey(selectedDate),
    });
    await queryClient.invalidateQueries({
      queryKey: ['attendance-admin', selectedDate],
    });
  };

  const checkInMutation = useMutation({
    mutationFn: async () => checkInService(),
    onSuccess: async (response) => {
      handleApiResponse(response);
      await invalidateAttendanceData();
    },
    onError: (error: { message?: string }) =>
      showToast(error.message ?? 'Unable to check in', 'error'),
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => checkOutService(),
    onSuccess: async (response) => {
      handleApiResponse(response);
      await invalidateAttendanceData();
    },
    onError: (error: { message?: string }) =>
      showToast(error.message ?? 'Unable to check out', 'error'),
  });

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingRow(null);
  };

  const updateRecordMutation = useMutation({
    mutationFn: (payload: {
      recordId: string;
      data: AttendanceRecordMutationPayload;
    }) => updateAttendanceRecordService(payload.recordId, payload.data),
    onSuccess: async (response) => {
      handleApiResponse(response);
      closeEditDialog();
      await queryClient.invalidateQueries({
        queryKey: ['attendance-admin', selectedDate],
      });
    },
    onError: (error: { message?: string }) =>
      showToast(error.message ?? 'Unable to update record', 'error'),
  });

  const upsertRecordMutation = useMutation({
    mutationFn: (payload: {
      employee_id: string;
      date: string;
      check_in?: string | null;
      check_out?: string | null;
      shift_id?: string | null;
      status?: 'present' | 'absent';
    }) => upsertAttendanceRecordService(payload),
    onSuccess: async (response) => {
      handleApiResponse(response);
      closeEditDialog();
      await queryClient.invalidateQueries({
        queryKey: ['attendance-admin', selectedDate],
      });
    },
    onError: (error: { message?: string }) =>
      showToast(error.message ?? 'Unable to save record', 'error'),
  });

  const closeShiftDialog = () => {
    setIsShiftDialogOpen(false);
    setEditingShift(null);
  };

  const createShiftMutation = useMutation({
    mutationFn: createShiftService,
    onSuccess: async (response) => {
      handleApiResponse(response);
      closeShiftDialog();
      await queryClient.invalidateQueries({ queryKey: shiftsKey });
    },
    onError: (error: { message?: string }) =>
      showToast(error.message ?? 'Unable to create shift', 'error'),
  });

  const updateShiftMutation = useMutation({
    mutationFn: (payload: {
      shiftId: string;
      data: Partial<ShiftFormPayload>;
    }) => updateShiftService(payload.shiftId, payload.data),
    onSuccess: async (response) => {
      handleApiResponse(response);
      closeShiftDialog();
      await queryClient.invalidateQueries({ queryKey: shiftsKey });
    },
    onError: (error: { message?: string }) =>
      showToast(error.message ?? 'Unable to update shift', 'error'),
  });

  const deleteShiftMutation = useMutation({
    mutationFn: deleteShiftService,
    onSuccess: async (response) => {
      handleApiResponse(response);
      await queryClient.invalidateQueries({ queryKey: shiftsKey });
    },
    onError: (error: { message?: string }) =>
      showToast(error.message ?? 'Unable to delete shift', 'error'),
  });

  const updateWorkingDaysMutation = useMutation({
    mutationFn: updateWorkingDaysService,
    onSuccess: async (response) => {
      handleApiResponse(response);
      await queryClient.invalidateQueries({ queryKey: attendanceSettingsKey });
      await queryClient.invalidateQueries({
        queryKey: ['attendance-admin', selectedDate],
      });
    },
    onError: (error: { message?: string }) =>
      showToast(error.message ?? 'Unable to update working days', 'error'),
  });

  const adminData = (adminAttendanceQuery.data?.data ??
    null) as AdminAttendanceResponse | null;
  const myData = (myAttendanceQuery.data?.data ??
    null) as MyAttendanceResponse | null;
  const shifts = shiftsQuery.data?.data ?? [];
  const workingDays =
    (attendanceSettingsQuery.data?.data.working_days as Array<WorkingDay>) ??
    ([1, 2, 3, 4, 5] as Array<WorkingDay>);
  const filterableAttendanceShifts = adminData?.shifts ?? [];

  const headerDescription = useMemo(() => {
    if (activeView === 'my') {
      return `Your attendance - ${formatHeaderDate(selectedDate)}`;
    }

    if (activeView === 'team') {
      return `Team overview - ${formatHeaderDate(selectedDate)}`;
    }

    return 'Manage attendance configuration';
  }, [activeView, selectedDate]);

  const dialogShifts = useMemo(
    () =>
      (adminData?.shifts ?? []).map((shift) => ({
        id: shift.id,
        name: shift.name,
      })),
    [adminData?.shifts],
  );

  const submitRecord = (payload: AttendanceRecordMutationPayload) => {
    const employeeId = editingRow?.employee.id;

    if (!employeeId) {
      showToast('Employee is missing from the selection.', 'error');
      return;
    }

    if (editingRow?.record?.id) {
      updateRecordMutation.mutate({
        recordId: editingRow.record.id,
        data: payload,
      });
      return;
    }

    upsertRecordMutation.mutate({
      employee_id: employeeId,
      date: selectedDate,
      ...payload,
    });
  };

  const markRowStatus = (
    row: AdminAttendanceRow,
    status: AttendanceRecordMutationPayload['status'],
  ) => {
    const shiftId = row.record?.shift_id ?? row.employee.shift_id;

    if (row.record?.id) {
      updateRecordMutation.mutate({
        recordId: row.record.id,
        data: { shift_id: shiftId, status },
      });
      return;
    }

    upsertRecordMutation.mutate({
      employee_id: row.employee.id,
      date: selectedDate,
      shift_id: row.employee.shift_id,
      status,
    });
  };

  const submitShift = (payload: ShiftFormPayload) => {
    if (editingShift) {
      updateShiftMutation.mutate({
        shiftId: editingShift.id,
        data: payload,
      });
      return;
    }

    createShiftMutation.mutate(payload);
  };

  const setAttendanceSearchTerm = (value: string) => {
    setSearchTerm(value);
  };

  const setAttendanceStatusFilter = (value: string) => {
    setStatusFilter(
      value as AttendanceDisplayStatus | typeof allAttendanceStatuses,
    );
  };

  const setAttendanceShiftFilter = (value: string) => {
    setShiftFilter(value);
  };

  const resetAttendanceFilters = () => {
    setSearchTerm('');
    setStatusFilter(allAttendanceStatuses);
    setShiftFilter(allAttendanceShifts);
  };

  return {
    activeView,
    adminData,
    adminAttendanceQuery,
    allAttendanceShifts,
    allAttendanceStatuses,
    checkInMutation,
    checkOutMutation,
    deleteShift: (shiftId: string) => deleteShiftMutation.mutate(shiftId),
    dialogShifts,
    editingRow,
    editingShift,
    filterableAttendanceShifts,
    hasAttendanceFilters,
    headerDescription,
    isFiltersVisible,
    isAdmin,
    isEditDialogOpen,
    isMemberOnlyView,
    isSearchVisible,
    isShiftDialogOpen,
    markRowAbsent: (row: AdminAttendanceRow) => markRowStatus(row, 'absent'),
    markRowPresent: (row: AdminAttendanceRow) => markRowStatus(row, 'present'),
    myData,
    canLog,
    canViewTeam,
    canApprove,
    canManageShifts,
    onEditDialogOpenChange: (open: boolean) => {
      setIsEditDialogOpen(open);

      if (!open) {
        setEditingRow(null);
      }
    },
    onShiftDialogOpenChange: (open: boolean) => {
      setIsShiftDialogOpen(open);

      if (!open) {
        setEditingShift(null);
      }
    },
    openCreateShiftDialog: () => {
      setEditingShift(null);
      setIsShiftDialogOpen(true);
    },
    openEditDialog: (row: AdminAttendanceRow) => {
      setEditingRow(row);
      setIsEditDialogOpen(true);
    },
    openEditShiftDialog: (shift: Shift) => {
      setEditingShift(shift);
      setIsShiftDialogOpen(true);
    },
    pendingRecordSave:
      updateRecordMutation.isPending || upsertRecordMutation.isPending,
    pendingShiftSave:
      createShiftMutation.isPending || updateShiftMutation.isPending,
    resetAttendanceFilters,
    selectedDate,
    selectedDateLabel: formatHeaderDate(selectedDate),
    searchTerm,
    setActiveView,
    setAttendanceSearchTerm,
    setIsFiltersVisible,
    setIsSearchVisible,
    setSelectedDate,
    setShiftFilter: setAttendanceShiftFilter,
    setStatusFilter: setAttendanceStatusFilter,
    shiftFilter,
    shifts,
    shiftsQuery,
    statusFilter,
    submitRecord,
    submitShift,
    attendanceSettingsQuery,
    pendingWorkingDaysSave: updateWorkingDaysMutation.isPending,
    resetWorkingDays: () =>
      updateWorkingDaysMutation.mutate([1, 2, 3, 4, 5] as Array<WorkingDay>),
    submitWorkingDays: (days: Array<WorkingDay>) =>
      updateWorkingDaysMutation.mutate(days),
    workingDays,
  };
}

export { useAttendancePage };
