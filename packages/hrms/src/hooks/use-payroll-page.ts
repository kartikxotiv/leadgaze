/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { showToast } from '../components/global/ToastAlert';
import {
  approvePayrollRunService,
  createPayrollRunService,
  deleteEmployeeCompensationService,
  deleteEmployeePayItemService,
  deleteSalaryComponentService,
  deleteSalaryStructureService,
  getPayrollDashboardService,
  listSalaryComponentsService,
} from '../server/services/payroll.service';
import { handleApiResponse } from '../utils/api-response-handler';

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

export function usePayrollPage() {
  const queryClient = useQueryClient();

  const [isStructureConfigDialogOpen, setIsStructureConfigDialogOpen] =
    useState(false);
  const [selectedStructure, setSelectedStructure] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isPayItemDialogOpen, setIsPayItemDialogOpen] = useState(false);
  const [isPayslipDetailsDialogOpen, setIsPayslipDetailsDialogOpen] =
    useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  const [editingStructure, setEditingStructure] = useState<any | null>(null);
  const [editingComponent, setEditingComponent] = useState<any | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);
  const [editingPayItem, setEditingPayItem] = useState<any | null>(null);

  const [isCreateRunDialogOpen, setIsCreateRunDialogOpen] = useState(false);
  const [isCreateStructureDialogOpen, setIsCreateStructureDialogOpen] =
    useState(false);
  const [isCreateComponentDialogOpen, setIsCreateComponentDialogOpen] =
    useState(false);
  const [isCreateCompensationDialogOpen, setIsCreateCompensationDialogOpen] =
    useState(false);
  const [createRunForm, setCreateRunForm] = useState({
    period_start: '',
    period_end: '',
  });

  const dashboardQuery = useQuery({
    queryKey: ['payroll-dashboard'],
    queryFn: getPayrollDashboardService,
  });

  const componentsQuery = useQuery({
    queryKey: ['salary-components'],
    queryFn: listSalaryComponentsService,
  });

  const createRunMutation = useMutation({
    mutationFn: createPayrollRunService,
    onSuccess: async (response) => {
      handleApiResponse(response);
      setIsCreateRunDialogOpen(false);
      setCreateRunForm({ period_start: '', period_end: '' });
      await queryClient.invalidateQueries({ queryKey: ['payroll-dashboard'] });
    },
    onError: (error: { message?: string }) => {
      showToast(error.message ?? 'Unable to create payroll run', 'error');
    },
  });

  const approveRunMutation = useMutation({
    mutationFn: approvePayrollRunService,
    onSuccess: async (response) => {
      handleApiResponse(response);
      await queryClient.invalidateQueries({ queryKey: ['payroll-dashboard'] });
    },
    onError: (error: { message?: string }) => {
      showToast(error.message ?? 'Unable to approve payroll run', 'error');
    },
  });

  const deleteStructureMutation = useMutation({
    mutationFn: deleteSalaryStructureService,
    onSuccess: () => {
      showToast('Structure deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['payroll-dashboard'] });
    },
  });

  const deleteComponentMutation = useMutation({
    mutationFn: deleteSalaryComponentService,
    onSuccess: () => {
      showToast('Component deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['salary-components'] });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: deleteEmployeeCompensationService,
    onSuccess: () => {
      showToast('Assignment deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['payroll-dashboard'] });
    },
  });

  const deletePayItemMutation = useMutation({
    mutationFn: deleteEmployeePayItemService,
    onSuccess: () => {
      showToast('Pay item deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['payroll-dashboard'] });
    },
  });

  const dashboardData = dashboardQuery.data?.data;

  const metricsItems = useMemo(() => {
    if (!dashboardData?.metrics) {
      return [];
    }

    const { metrics } = dashboardData;
    return [
      {
        label: 'Active Assignments',
        value: metrics.activeAssignments.toString(),
        hint: 'Employee compensation assignments in force',
      },
      {
        label: 'Open Pay Items',
        value: metrics.openPayItems.toString(),
        hint: 'Pending bonuses, arrears, and reimbursements',
      },
      {
        label: 'Current Run Window',
        value: metrics.currentRunWindow || '-',
        hint: 'Active payroll period',
      },
      {
        label: 'Published Payslips',
        value: metrics.publishedPayslips.toString(),
        hint: 'Frozen payslip snapshots',
      },
    ];
  }, [dashboardData?.metrics]);

  return {
    componentsQuery,
    createRunForm,
    createRunMutation,
    dashboardData,
    dashboardQuery,
    deleteAssignmentMutation,
    deleteComponentMutation,
    deletePayItemMutation,
    deleteStructureMutation,
    editingAssignment,
    editingComponent,
    editingPayItem,
    editingStructure,
    isCreateCompensationDialogOpen,
    isCreateComponentDialogOpen,
    isCreateRunDialogOpen,
    isCreateStructureDialogOpen,
    isPayItemDialogOpen,
    isPayslipDetailsDialogOpen,
    isStructureConfigDialogOpen,
    metricsItems,
    selectedPayslip,
    selectedStructure,
    setCreateRunForm,
    setEditingAssignment,
    setEditingComponent,
    setEditingPayItem,
    setEditingStructure,
    setIsCreateCompensationDialogOpen,
    setIsCreateComponentDialogOpen,
    setIsCreateRunDialogOpen,
    setIsCreateStructureDialogOpen,
    setIsPayItemDialogOpen,
    setIsPayslipDetailsDialogOpen,
    setIsStructureConfigDialogOpen,
    setSelectedPayslip,
    setSelectedStructure,
    handleApproveRun: (runId: string) => approveRunMutation.mutate(runId),
    handleCreateRun: () => {
      if (!createRunForm.period_start || !createRunForm.period_end) {
        showToast('Please fill in both period start and end dates', 'error');
        return;
      }

      createRunMutation.mutate({
        period_start: createRunForm.period_start,
        period_end: createRunForm.period_end,
      });
    },
    handleOpenConfig: (structure: { id: string; name: string }) => {
      setSelectedStructure(structure);
      setIsStructureConfigDialogOpen(true);
    },
  };
}
