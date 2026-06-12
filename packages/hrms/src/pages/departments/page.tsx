'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader } from '@kit/ui/page';
import { TableStatusMetricTab } from '@kit/ui/table-status-metric-tab';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';

import { DeleteDepartmentDialog } from '../../components/departments/delete-department-dialog';
import { DepartmentFormDialog } from '../../components/departments/department-form-dialog';
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

const departmentColumns: Array<{ id: string; label: string }> = [
  { id: 'sno', label: 'S. No.' },
  { id: 'department', label: 'Department' },
  { id: 'code', label: 'Code' },
  { id: 'parent', label: 'Parent' },
  { id: 'head', label: 'Head' },
  { id: 'cost_center', label: 'Cost Center' },
  { id: 'status', label: 'Status' },
  { id: 'updated', label: 'Updated' },
];

type DepartmentQuickFilter = 'active' | 'all' | 'assigned_heads' | 'root';

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

export function DepartmentsPage(props: {
  headerActions?: ReactNode;
  workspaceName?: string;
}) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState<DepartmentQuickFilter>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  );
  const [departmentToDelete, setDepartmentToDelete] =
    useState<Department | null>(null);
  const { hasPermission } = useRbac();
  const canCreateDepartment = hasPermission('departments', 'create', 'team');
  const { visibility, toggleVisibility, isVisible, reset } =
    useColumnVisibility('hrms-departments', {
      sno: true,
      department: true,
      code: true,
      parent: true,
      head: true,
      cost_center: true,
      status: true,
      updated: false,
    });

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

  const filteredDepartments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return departments.filter((department) => {
      const matchesQuickFilter =
        quickFilter === 'all' ||
        (quickFilter === 'active' && department.is_active) ||
        (quickFilter === 'root' && !department.parent_department_id) ||
        (quickFilter === 'assigned_heads' &&
          Boolean(department.head_account_id));

      if (!matchesQuickFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return buildDepartmentSearchText(department).includes(query);
    });
  }, [departments, quickFilter, searchTerm]);

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
    <>
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden">
        <PageHeader
          className="bg-sidebar shrink-0"
          title={`Departments (${filteredDepartments.length})`}
          description={
            props.workspaceName
              ? `${props.workspaceName} HR structure`
              : 'HR department structure'
          }
        >
          {props.headerActions}
        </PageHeader>
      </div>

        <div className="w-full max-w-full min-w-0 overflow-x-auto pb-2 pt-2">
            <div className="flex flex-wrap items-center gap-2">
            <TableStatusMetricTab
              id="all"
              color="#4eacff"
              statusName="All Departments"
              count={summary.totalCount}
              isSelected={quickFilter === 'all'}
              onClick={() => setQuickFilter('all')}
            />
            <TableStatusMetricTab
              id="active"
              color="#22c55e"
              statusName="Active Departments"
              count={summary.activeCount}
              isSelected={quickFilter === 'active'}
              onClick={() => setQuickFilter('active')}
            />
            <TableStatusMetricTab
              id="root"
              color="#6366f1"
              statusName="Root Departments"
              count={summary.rootCount}
              isSelected={quickFilter === 'root'}
              onClick={() => setQuickFilter('root')}
            />
            <TableStatusMetricTab
              id="assigned_heads"
              color="#8b5cf6"
              statusName="Heads Assigned"
              count={summary.assignedHeadsCount}
              isSelected={quickFilter === 'assigned_heads'}
              onClick={() => setQuickFilter('assigned_heads')}
            />
          </div>
        </div>

        <div className="w-full max-w-full min-w-0 shrink-0 border-b pb-2">
          <ListToolBar
            showSearch
            searchPlaceholder="Search departments..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            activeFilterCount={quickFilter === 'all' ? 0 : 1}
            onClearFilters={() => setQuickFilter('all')}
            actions={[
              {
                key: 'add',
                label: 'Add Department',
                icon: Plus,
                onClick: onCreateRequested,
                show: canCreateDepartment,
                buttonVariant: 'default',
              },
            ]}
            columnVisibilitySlot={
              <ColumnVisibilitySelector
                columns={departmentColumns}
                visibility={visibility}
                onToggle={toggleVisibility}
                onReset={reset}
              />
            }
          />
        </div>
      

      <PageBody className="bg-sidebar sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 gap-0">
          <DepartmentsDirectoryCard
            departments={departments}
            filteredDepartments={filteredDepartments}
            hasFilters={Boolean(searchTerm.trim()) || quickFilter !== 'all'}
            isColumnVisible={isVisible}
            isLoading={departmentsQuery.isLoading}
            onDeleteRequested={setDepartmentToDelete}
            onEditRequested={onEditRequested}
            visibility={visibility}
          />
        </div>
      </PageBody>

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
    </>
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
