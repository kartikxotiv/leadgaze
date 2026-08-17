'use client';

import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { showToast } from '../components/global/ToastAlert';
import { useRbac } from '../components/rbac/rbac-context';
import {
  type EmployeeStatusFilter,
  allEmployeeStatuses,
  employeeOptionsQueryKey,
  employeesQueryKey,
  emptyEmployeeOptions,
  emptySummary,
} from '../pages/employees/page.data';
import {
  createEmployeeService,
  deleteEmployeeService,
  getEmployeeOptionsService,
  inviteEmployeeService,
  listPaginatedEmployeesService,
  updateEmployeeService,
} from '../server/services/employee.service';
import type { Employee, EmployeeFormPayload } from '../types/employee.type';
import { handleApiResponse } from '../utils/api-response-handler';

export function useEmployeesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [statusFilter, setStatusFilter] =
    useState<EmployeeStatusFilter>(allEmployeeStatuses);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(
    null,
  );
  const normalizedSearchTerm = searchTerm.trim();
  const hasEmployeeFilters =
    Boolean(normalizedSearchTerm) || statusFilter !== allEmployeeStatuses;

  const employeesQuery = useQuery({
    queryKey: [
      ...employeesQueryKey,
      {
        page,
        pageSize,
        search: normalizedSearchTerm,
        status: statusFilter,
      },
    ],
    queryFn: () =>
      listPaginatedEmployeesService({
        page,
        pageSize,
        search: normalizedSearchTerm || undefined,
        status: statusFilter === allEmployeeStatuses ? undefined : statusFilter,
      }),
    placeholderData: (previousData) => previousData,
  });

  const { hasPermission } = useRbac();
  const canCreateEmployee = hasPermission('employees', 'create', 'team');

  const employeeOptionsQuery = useQuery({
    queryKey: employeeOptionsQueryKey,
    queryFn: getEmployeeOptionsService,
  });

  const employeesData = employeesQuery.data?.data;
  const employees = useMemo<Array<Employee>>(
    () => employeesData?.employees ?? [],
    [employeesData],
  );
  const pagination = employeesData?.pagination ?? {
    hasNextPage: false,
    hasPreviousPage: false,
    page,
    pageSize,
    total: 0,
    totalPages: 0,
  };
  const summary = employeesData?.summary ?? emptySummary;
  const employeeOptions =
    employeeOptionsQuery.data?.data ?? emptyEmployeeOptions;

  useEffect(() => {
    if (pagination.totalPages > 0 && page > pagination.totalPages) {
      setPage(pagination.totalPages);
    }
  }, [page, pagination.totalPages]);

  const createEmployee = useMutation({
    mutationFn: createEmployeeService,
    onSuccess: async (response) => {
      handleApiResponse(response);
      setIsDialogOpen(false);
      await invalidateEmployeeQueries(queryClient);
    },
    onError: (error: { message?: string }) => {
      showToast(error.message ?? 'Unable to create employee', 'error');
    },
  });

  const inviteEmployee = useMutation({
    mutationFn: inviteEmployeeService,
    onSuccess: async (response) => {
      handleApiResponse(response);
      setIsDialogOpen(false);
      await invalidateEmployeeQueries(queryClient);
    },
    onError: (error: { message?: string }) => {
      showToast(error.message ?? 'Unable to invite employee', 'error');
    },
  });

  const updateEmployee = useMutation({
    mutationFn: (payload: {
      data: Partial<EmployeeFormPayload>;
      employeeId: string;
    }) => updateEmployeeService(payload.employeeId, payload.data),
    onSuccess: async (response) => {
      handleApiResponse(response);
      setEditingEmployee(null);
      setIsDialogOpen(false);
      await invalidateEmployeeQueries(queryClient);
    },
    onError: (error: { message?: string }) => {
      showToast(error.message ?? 'Unable to update employee', 'error');
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: deleteEmployeeService,
    onSuccess: async (response) => {
      handleApiResponse(response);
      setEmployeeToDelete(null);
      await invalidateEmployeeQueries(queryClient);
    },
    onError: (error: { message?: string }) => {
      showToast(error.message ?? 'Unable to delete employee', 'error');
    },
  });

  return {
    canCreateEmployee,
    editingEmployee,
    employeeOptions,
    employees,
    employeeToDelete,
    hasEmployeeFilters,
    isDeletingEmployee: deleteEmployee.isPending,
    isDialogOpen,
    isEmployeeDialogPending:
      createEmployee.isPending ||
      updateEmployee.isPending ||
      inviteEmployee.isPending,
    isEmployeesLoading: employeesQuery.isLoading,
    isFiltersVisible,
    isSearchVisible,
    pagination,
    searchTerm,
    statusFilter,
    summary,
    onAddRequested: () => {
      setEditingEmployee(null);
      setIsDialogOpen(true);
    },
    onConfirmDeleteEmployee: () => {
      if (!employeeToDelete) {
        return;
      }

      deleteEmployee.mutate(employeeToDelete.id);
    },
    onDeleteDialogOpenChange: (open: boolean) => {
      if (!open) {
        setEmployeeToDelete(null);
      }
    },
    onEditRequested: (employee: Employee) => {
      setEditingEmployee(employee);
      setIsDialogOpen(true);
    },
    onEmployeeDialogOpenChange: (open: boolean) => {
      setIsDialogOpen(open);

      if (!open) {
        setEditingEmployee(null);
      }
    },
    onPageChange: setPage,
    onPageSizeChange: (newPageSize: number) => {
      setPageSize(newPageSize);
      setPage(1);
    },
    onSearchTermChange: (value: string) => {
      setSearchTerm(value);
      setPage(1);
    },
    onStatusFilterChange: (value: string) => {
      setStatusFilter(value as EmployeeStatusFilter);
      setPage(1);
    },
    onSubmitEmployee: (payload: EmployeeFormPayload) => {
      if (editingEmployee) {
        updateEmployee.mutate({
          data: payload,
          employeeId: editingEmployee.id,
        });

        return;
      }

      if (payload.invite_if_missing) {
        inviteEmployee.mutate(payload);
        return;
      }

      createEmployee.mutate(payload);
    },
    resetEmployeeFilters: () => {
      setSearchTerm('');
      setStatusFilter(allEmployeeStatuses);
      setPage(1);
    },
    setEmployeeToDelete,
    setIsFiltersVisible,
    setIsSearchVisible,
  };
}

async function invalidateEmployeeQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: employeesQueryKey }),
    queryClient.invalidateQueries({ queryKey: employeeOptionsQueryKey }),
  ]);
}

export type EmployeesPageController = ReturnType<typeof useEmployeesPage>;
