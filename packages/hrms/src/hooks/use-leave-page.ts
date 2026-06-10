'use client';

import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { showToast } from '../components/global/ToastAlert';
import { useRbac } from '../components/rbac/rbac-context';
import {
  createLeaveHolidayService,
  createLeaveRequestService,
  createLeaveTypeService,
  deleteLeaveHolidayService,
  deleteLeaveTypeService,
  getLeaveDashboardService,
  updateLeaveHolidayService,
  updateLeaveRequestService,
  updateLeaveTypeService,
} from '../server/services/leave.service';
import type {
  LeaveDashboardResponse,
  LeaveHoliday,
  LeaveHolidayPayload,
  LeavePermissions,
  LeaveRequestActionPayload,
  LeaveRequestCreatePayload,
  LeaveType,
  LeaveTypePayload,
} from '../types/leave.type';
import { handleApiResponse } from '../utils/api-response-handler';

export type LeaveTab =
  | 'approvals'
  | 'holidays'
  | 'reports'
  | 'requests'
  | 'types';

const leaveDashboardKey = (year: number) => ['leave-dashboard', year];

function useLeavePage() {
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear(),
  );
  const [activeTab, setActiveTab] = useState<LeaveTab>('requests');
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<LeaveHoliday | null>(
    null,
  );

  const {
    hasPermission,
    isAdmin,
    isLoading: isRbacLoading,
    snapshot,
  } = useRbac();

  const isHr = Boolean(snapshot?.roleKeys?.includes('hr'));
  const isManager = Boolean(snapshot?.roleKeys?.includes('manager'));
  const isMember = Boolean(snapshot?.roleKeys?.includes('member'));
  const canApply =
    Boolean(snapshot?.employeeId) &&
    !isAdmin &&
    hasPermission('leave', 'create', 'own');
  const canApprove =
    hasPermission('leave', 'approve_requests', 'team') ||
    hasPermission('leave', 'approve', 'team');
  const canViewApprovals =
    canApprove || hasPermission('leave', 'view_approvals', 'team');
  const canManageHolidays = hasPermission('leave', 'manage_holidays', 'team');
  const canManageLeaveTypes = hasPermission('leave', 'manage_types', 'team');
  const canManageConfiguration = canManageHolidays || canManageLeaveTypes;
  const canViewHolidays =
    canManageHolidays ||
    hasPermission('leave', 'view_holidays', 'own') ||
    hasPermission('leave', 'view', 'own');
  const canViewRequests =
    Boolean(snapshot?.employeeId) &&
    (hasPermission('leave', 'view_requests', 'own') ||
      hasPermission('leave', 'view', 'own'));
  const canViewReports = hasPermission('leave', 'view_reports', 'team');

  const rbacPermissions = useMemo<LeavePermissions>(
    () => ({
      canApply,
      canApprove,
      canManageHolidays,
      canManageLeaveTypes,
      canManageConfiguration,
      canViewApprovals,
      canViewHolidays,
      canViewRequests,
      canViewReports,
      isAdmin,
      isHr,
      isManager,
      isMember,
    }),
    [
      canApply,
      canApprove,
      canManageConfiguration,
      canManageHolidays,
      canManageLeaveTypes,
      canViewApprovals,
      canViewHolidays,
      canViewReports,
      canViewRequests,
      isAdmin,
      isHr,
      isManager,
      isMember,
    ],
  );

  const rbacAvailableTabs = useMemo<LeaveTab[]>(() => {
    const tabs: LeaveTab[] = [];

    if (rbacPermissions.canViewRequests || rbacPermissions.canApply) {
      tabs.push('requests');
    }

    if (rbacPermissions.canViewApprovals) {
      tabs.push('approvals');
    }

    if (rbacPermissions.canViewHolidays || rbacPermissions.canManageHolidays) {
      tabs.push('holidays');
    }

    if (rbacPermissions.canManageLeaveTypes) {
      tabs.push('types');
    }

    if (rbacPermissions.canViewReports) {
      tabs.push('reports');
    }

    return tabs;
  }, [rbacPermissions]);

  const dashboardQuery = useQuery({
    queryKey: leaveDashboardKey(selectedYear),
    queryFn: () => getLeaveDashboardService(selectedYear),
    enabled: !isRbacLoading && rbacAvailableTabs.length > 0,
  });

  const dashboard = (dashboardQuery.data?.data ??
    null) as LeaveDashboardResponse | null;
  const permissions = dashboard?.permissions ?? rbacPermissions;

  const availableTabs = useMemo<LeaveTab[]>(() => {
    const tabs: LeaveTab[] = [];

    if (permissions?.canViewRequests || permissions?.canApply) {
      tabs.push('requests');
    }

    if (permissions?.canViewApprovals) {
      tabs.push('approvals');
    }

    if (permissions?.canViewHolidays || permissions?.canManageHolidays) {
      tabs.push('holidays');
    }

    if (permissions?.canManageLeaveTypes) {
      tabs.push('types');
    }

    if (permissions?.canViewReports) {
      tabs.push('reports');
    }

    return tabs;
  }, [permissions]);

  useEffect(() => {
    if (availableTabs.includes(activeTab)) {
      return;
    }

    setActiveTab(availableTabs[0] ?? 'requests');
  }, [activeTab, availableTabs]);

  const invalidateDashboard = async () => {
    await queryClient.invalidateQueries({
      queryKey: leaveDashboardKey(selectedYear),
    });
  };

  const createLeaveRequestMutation = useMutation({
    mutationFn: (payload: LeaveRequestCreatePayload) =>
      createLeaveRequestService(payload),
    onSuccess: async (response) => {
      handleApiResponse(response);
      setIsRequestDialogOpen(false);
      await invalidateDashboard();
    },
    onError: (error: { message?: string }) =>
      showToast(error.message ?? 'Unable to submit leave request', 'error'),
  });

  const updateLeaveRequestMutation = useMutation({
    mutationFn: (payload: {
      data: LeaveRequestActionPayload;
      requestId: string;
    }) => updateLeaveRequestService(payload.requestId, payload.data),
    onSuccess: async (response) => {
      handleApiResponse(response);
      await invalidateDashboard();
    },
    onError: (error: { message?: string }) =>
      showToast(error.message ?? 'Unable to update leave request', 'error'),
  });

  const closeTypeDialog = () => {
    setIsTypeDialogOpen(false);
    setEditingType(null);
  };

  const createLeaveTypeMutation = useMutation({
    mutationFn: (payload: LeaveTypePayload) => createLeaveTypeService(payload),
    onSuccess: async (response) => {
      handleApiResponse(response);
      closeTypeDialog();
      await invalidateDashboard();
    },
    onError: (error: { message?: string }) =>
      showToast(error.message ?? 'Unable to create leave type', 'error'),
  });

  const updateLeaveTypeMutation = useMutation({
    mutationFn: (payload: { data: LeaveTypePayload; typeId: string }) =>
      updateLeaveTypeService(payload.typeId, payload.data),
    onSuccess: async (response) => {
      handleApiResponse(response);
      closeTypeDialog();
      await invalidateDashboard();
    },
    onError: (error: { message?: string }) =>
      showToast(error.message ?? 'Unable to update leave type', 'error'),
  });

  const deleteLeaveTypeMutation = useMutation({
    mutationFn: (typeId: string) => deleteLeaveTypeService(typeId),
    onSuccess: async (response) => {
      handleApiResponse(response);
      await invalidateDashboard();
    },
    onError: (error: { message?: string }) =>
      showToast(error.message ?? 'Unable to archive leave type', 'error'),
  });

  const closeHolidayDialog = () => {
    setIsHolidayDialogOpen(false);
    setEditingHoliday(null);
  };

  const createLeaveHolidayMutation = useMutation({
    mutationFn: (payload: LeaveHolidayPayload) =>
      createLeaveHolidayService(payload),
    onSuccess: async (response) => {
      handleApiResponse(response);
      closeHolidayDialog();
      await invalidateDashboard();
    },
    onError: (error: { message?: string }) =>
      showToast(error.message ?? 'Unable to create holiday', 'error'),
  });

  const updateLeaveHolidayMutation = useMutation({
    mutationFn: (payload: { data: LeaveHolidayPayload; holidayId: string }) =>
      updateLeaveHolidayService(payload.holidayId, payload.data),
    onSuccess: async (response) => {
      handleApiResponse(response);
      closeHolidayDialog();
      await invalidateDashboard();
    },
    onError: (error: { message?: string }) =>
      showToast(error.message ?? 'Unable to update holiday', 'error'),
  });

  const deleteLeaveHolidayMutation = useMutation({
    mutationFn: (holidayId: string) => deleteLeaveHolidayService(holidayId),
    onSuccess: async (response) => {
      handleApiResponse(response);
      await invalidateDashboard();
    },
    onError: (error: { message?: string }) =>
      showToast(error.message ?? 'Unable to delete holiday', 'error'),
  });

  return {
    activeTab,
    approvalRequests: dashboard?.approvalRequests ?? [],
    availableTabs,
    balances: dashboard?.balances ?? [],
    createLeaveHolidayPending: createLeaveHolidayMutation.isPending,
    createLeaveRequestPending: createLeaveRequestMutation.isPending,
    createLeaveTypePending: createLeaveTypeMutation.isPending,
    dashboardQuery,
    deleteHoliday: (holidayId: string) =>
      deleteLeaveHolidayMutation.mutate(holidayId),
    deleteHolidayPending: deleteLeaveHolidayMutation.isPending,
    deleteLeaveType: (typeId: string) => deleteLeaveTypeMutation.mutate(typeId),
    deleteLeaveTypePending: deleteLeaveTypeMutation.isPending,
    editingHoliday,
    editingType,
    holidays: dashboard?.holidays ?? [],
    isHolidayDialogOpen,
    isRequestDialogOpen,
    isTypeDialogOpen,
    isRbacLoading,
    leaveTypes: dashboard?.leaveTypes ?? [],
    myRequests: dashboard?.myRequests ?? [],
    onHolidayDialogOpenChange: (open: boolean) => {
      setIsHolidayDialogOpen(open);

      if (!open) {
        setEditingHoliday(null);
      }
    },
    onRequestDialogOpenChange: setIsRequestDialogOpen,
    onTypeDialogOpenChange: (open: boolean) => {
      setIsTypeDialogOpen(open);

      if (!open) {
        setEditingType(null);
      }
    },
    openCreateHolidayDialog: () => {
      setEditingHoliday(null);
      setIsHolidayDialogOpen(true);
    },
    openCreateTypeDialog: () => {
      setEditingType(null);
      setIsTypeDialogOpen(true);
    },
    openEditHolidayDialog: (holiday: LeaveHoliday) => {
      setEditingHoliday(holiday);
      setIsHolidayDialogOpen(true);
    },
    openEditTypeDialog: (leaveType: LeaveType) => {
      setEditingType(leaveType);
      setIsTypeDialogOpen(true);
    },
    permissions,
    reports: dashboard?.reports ?? null,
    selectedYear,
    setActiveTab,
    setSelectedYear,
    submitHoliday: (payload: LeaveHolidayPayload) => {
      if (editingHoliday) {
        updateLeaveHolidayMutation.mutate({
          data: payload,
          holidayId: editingHoliday.id,
        });
        return;
      }

      createLeaveHolidayMutation.mutate(payload);
    },
    submitLeaveRequest: (payload: LeaveRequestCreatePayload) =>
      createLeaveRequestMutation.mutate(payload),
    submitType: (payload: LeaveTypePayload) => {
      if (editingType) {
        updateLeaveTypeMutation.mutate({
          data: payload,
          typeId: editingType.id,
        });
        return;
      }

      createLeaveTypeMutation.mutate(payload);
    },
    updateLeaveRequest: (requestId: string, data: LeaveRequestActionPayload) =>
      updateLeaveRequestMutation.mutate({
        data,
        requestId,
      }),
    updateLeaveRequestPending: updateLeaveRequestMutation.isPending,
    year: dashboard?.year ?? selectedYear,
  };
}

export { useLeavePage };
