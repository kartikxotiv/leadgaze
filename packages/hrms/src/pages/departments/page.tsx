'use client';

import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';

import { AddDepartmentButton } from '../../components/departments/add-department-button';
import { DeleteDepartmentDialog } from '../../components/departments/delete-department-dialog';
import { DepartmentFormDialog } from '../../components/departments/department-form-dialog';
import { DepartmentSummaryCards } from '../../components/departments/department-summary-cards';
import { DepartmentsDirectoryCard } from '../../components/departments/departments-directory-card';
import { showToast } from '../../components/global/ToastAlert';
import { useRbac } from '../../components/rbac/rbac-context';
import {
  createDepartmentService,
  deleteDepartmentService,
  getDepartmentOptionsService,
  listDepartmentsService,
  updateDepartmentService,
} from '../../server/services/department.service';
import type {
  Department,
  DepartmentFormPayload,
} from '../../types/department.type';
import { handleApiResponse } from '../../utils/api-response-handler';

const departmentsQueryKey = ['hrms', 'departments'];
const departmentOptionsQueryKey = ['hrms', 'department-options'];

function buildDepartmentSearchText(department: Department) {
  return [
    department.name,
    department.code,
    department.cost_center_code ?? '',
    department.parent_department?.name ?? '',
    department.parent_department?.code ?? '',
    department.parent_department_id ? '' : 'root',
    department.head_account?.name ?? '',
    department.head_account?.email ?? '',
    department.head_account_id ? 'assigned' : 'unassigned',
    department.is_active ? 'active' : 'inactive',
  ]
    .join(' ')
    .toLowerCase();
}

export function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  );
  const [departmentToDelete, setDepartmentToDelete] =
    useState<Department | null>(null);
  const { hasPermission } = useRbac();
  const canCreateDepartment = hasPermission('departments', 'create', 'team');

  const departmentsQuery = useQuery({
    queryKey: departmentsQueryKey,
    queryFn: listDepartmentsService,
  });

  const departmentOptionsQuery = useQuery({
    queryKey: departmentOptionsQueryKey,
    queryFn: getDepartmentOptionsService,
  });

  const departments = useMemo<Array<Department>>(
    () => departmentsQuery.data?.data ?? [],
    [departmentsQuery.data?.data],
  );
  const departmentOptions = departmentOptionsQuery.data?.data ?? {
    departments: [],
    headAccounts: [],
  };

  const createDepartment = useMutation({
    mutationFn: createDepartmentService,
    onSuccess: async (response) => {
      handleApiResponse(response);
      setIsFormOpen(false);
      await invalidateDepartmentQueries(queryClient);
    },
    onError: (error: { message?: string }) => {
      showToast(error.message ?? 'Unable to create department', 'error');
    },
  });

  const updateDepartment = useMutation({
    mutationFn: (payload: {
      data: DepartmentFormPayload;
      departmentId: string;
    }) => updateDepartmentService(payload.departmentId, payload.data),
    onSuccess: async (response) => {
      handleApiResponse(response);
      setEditingDepartment(null);
      setIsFormOpen(false);
      await invalidateDepartmentQueries(queryClient);
    },
    onError: (error: { message?: string }) => {
      showToast(error.message ?? 'Unable to update department', 'error');
    },
  });

  const deleteDepartment = useMutation({
    mutationFn: deleteDepartmentService,
    onSuccess: async (response) => {
      handleApiResponse(response);
      setDepartmentToDelete(null);
      await invalidateDepartmentQueries(queryClient);
    },
    onError: (error: { message?: string }) => {
      showToast(error.message ?? 'Unable to delete department', 'error');
    },
  });

  const filteredDepartments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return departments;
    }

    return departments.filter((department) =>
      buildDepartmentSearchText(department).includes(query),
    );
  }, [departments, searchTerm]);

  const summary = useMemo(() => {
    const activeCount = departments.filter(
      (department) => department.is_active,
    ).length;
    const rootCount = departments.filter(
      (department) => !department.parent_department_id,
    ).length;
    const assignedHeadsCount = departments.filter(
      (department) => department.head_account_id,
    ).length;

    return {
      activeCount,
      assignedHeadsCount,
      rootCount,
      totalCount: departments.length,
    };
  }, [departments]);

  const onCreateRequested = () => {
    setEditingDepartment(null);
    setIsFormOpen(true);
  };

  const onEditRequested = (department: Department) => {
    setEditingDepartment(department);
    setIsFormOpen(true);
  };

  const onDialogSubmit = (payload: DepartmentFormPayload) => {
    if (editingDepartment) {
      updateDepartment.mutate({
        data: payload,
        departmentId: editingDepartment.id,
      });
      return;
    }

    createDepartment.mutate(payload);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <DepartmentSummaryCards summary={summary} />

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {isSearchVisible ? (
            <div className="relative">
              <Input
                className="h-9 w-full pr-9 sm:w-[320px]"
                placeholder="Search departments"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <Button
                aria-label="Close search"
                className="absolute top-0 right-0 h-9 w-9"
                size="icon"
                variant="ghost"
                onClick={() => {
                  setSearchTerm('');
                  setIsSearchVisible(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              aria-label="Search departments"
              size="icon"
              variant="outline"
              onClick={() => setIsSearchVisible(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}

          {canCreateDepartment ? (
            <AddDepartmentButton onClick={onCreateRequested} />
          ) : null}
        </div>
      </div>

      <DepartmentsDirectoryCard
        departments={departments}
        filteredDepartments={filteredDepartments}
        isLoading={departmentsQuery.isLoading}
        onDeleteRequested={setDepartmentToDelete}
        onEditRequested={onEditRequested}
      />

      <DepartmentFormDialog
        department={editingDepartment}
        isPending={createDepartment.isPending || updateDepartment.isPending}
        onOpenChange={(open) => {
          setIsFormOpen(open);

          if (!open) {
            setEditingDepartment(null);
          }
        }}
        onSubmit={onDialogSubmit}
        open={isFormOpen}
        options={departmentOptions}
      />

      <DeleteDepartmentDialog
        department={departmentToDelete}
        isPending={deleteDepartment.isPending}
        onConfirm={() => {
          if (!departmentToDelete) {
            return;
          }

          deleteDepartment.mutate(departmentToDelete.id);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setDepartmentToDelete(null);
          }
        }}
        open={Boolean(departmentToDelete)}
      />
    </section>
  );
}

async function invalidateDepartmentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: departmentsQueryKey }),
    queryClient.invalidateQueries({ queryKey: departmentOptionsQueryKey }),
  ]);
}
