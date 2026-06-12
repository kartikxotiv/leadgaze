'use client';

import type { ReactNode } from 'react';

import { Plus } from 'lucide-react';

import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader } from '@kit/ui/page';
import { TableStatusMetricTab } from '@kit/ui/table-status-metric-tab';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';

import { AddEmployessDialog } from '../../components/employees/add-employees';
import { DeleteEmployeeDialog } from '../../components/employees/delete-employee-dialog';
import { getEmployeeStatusLabel } from '../../components/employees/employee-status-badge';
import { EmployeesDirectoryCard } from '../../components/employees/employees-directory-card';
import { useEmployeesPage } from '../../hooks/use-employees-page';
import { allEmployeeStatuses, employeeStatusOptions } from './page.data';

const employeeColumns: Array<{ id: string; label: string }> = [
  { id: 'sno', label: 'S. No.' },
  { id: 'employee', label: 'Employee' },
  { id: 'code', label: 'Code' },
  { id: 'department', label: 'Department' },
  { id: 'manager', label: 'Manager' },
  { id: 'designation', label: 'Designation' },
  { id: 'employment_type', label: 'Employment Type' },
  { id: 'status', label: 'Status' },
  { id: 'joining_date', label: 'Joining Date' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
];

const statusColors = {
  active: '#22c55e',
  invited: '#f59e0b',
  probation: '#6366f1',
  notice_period: '#ef4444',
  inactive: '#64748b',
  exited: '#94a3b8',
} as const;

export function EmployeesPage(props: {
  headerActions?: ReactNode;
  workspaceName?: string;
}) {
  const controller = useEmployeesPage();
  const { visibility, toggleVisibility, isVisible, reset } =
    useColumnVisibility('hrms-employees', {
      sno: true,
      employee: true,
      code: true,
      department: true,
      manager: true,
      designation: true,
      employment_type: false,
      status: true,
      joining_date: true,
      email: false,
      phone: false,
    });

  const selectedStatusLabel =
    controller.statusFilter === allEmployeeStatuses
      ? 'All statuses'
      : getEmployeeStatusLabel(controller.statusFilter);
  const activeFilterCount =
    controller.statusFilter === allEmployeeStatuses ? 0 : 1;
  const visibleTotal = controller.pagination.total;

  return (
    <>
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden">
        <PageHeader
          className=""
          title={`Employees (${visibleTotal})`}
          description={
            props.workspaceName
              ? `${props.workspaceName} employee directory`
              : 'Employee directory'
          }
        >
          {props.headerActions}
        </PageHeader>
      </div>

        <div className="w-full max-w-full min-w-0 overflow-x-auto pb-2 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <TableStatusMetricTab
              id={allEmployeeStatuses}
              color="#4eacff"
              statusName="All Employees"
              count={controller.summary.totalCount}
              isSelected={controller.statusFilter === allEmployeeStatuses}
              onClick={() =>
                controller.onStatusFilterChange(allEmployeeStatuses)
              }
            />
            <TableStatusMetricTab
              id="active"
              color={statusColors.active}
              statusName="Active Employees"
              count={controller.summary.activeCount}
              isSelected={controller.statusFilter === 'active'}
              onClick={() => controller.onStatusFilterChange('active')}
            />
            <TableStatusMetricTab
              id="invited"
              color={statusColors.invited}
              statusName="Pending Invites"
              count={controller.summary.invitedCount}
              isSelected={controller.statusFilter === 'invited'}
              onClick={() => controller.onStatusFilterChange('invited')}
            />
            <TableStatusMetricTab
              id="departments"
              color="#8b5cf6"
              statusName="Departments Covered"
              count={controller.summary.departmentCoverage}
              className="cursor-default"
            />
          </div>
        </div>

        <div className="w-full max-w-full min-w-0 shrink-0 border-b pb-2">
          <ListToolBar
            showSearch
            searchPlaceholder="Search employees..."
            searchValue={controller.searchTerm}
            onSearchChange={controller.onSearchTermChange}
            showFilter
            filterGroups={[
              {
                key: 'status',
                label: 'Status',
                selectedValue:
                  controller.statusFilter === allEmployeeStatuses
                    ? ''
                    : controller.statusFilter,
                selectedLabel: selectedStatusLabel,
                options: employeeStatusOptions
                  .filter((option) => option.value !== allEmployeeStatuses)
                  .map((option) => ({
                    value: option.value,
                    label: option.label,
                    color:
                      option.value === allEmployeeStatuses
                        ? undefined
                        : statusColors[option.value],
                  })),
                onSelect: (value) =>
                  controller.onStatusFilterChange(value || allEmployeeStatuses),
              },
            ]}
            activeFilterCount={activeFilterCount}
            onClearFilters={controller.resetEmployeeFilters}
            actions={[
              {
                key: 'add',
                label: 'Add Employee',
                icon: Plus,
                onClick: controller.onAddRequested,
                show: controller.canCreateEmployee,
                buttonVariant: 'default',
              },
            ]}
            columnVisibilitySlot={
              <ColumnVisibilitySelector
                columns={employeeColumns}
                visibility={visibility}
                onToggle={toggleVisibility}
                onReset={reset}
              />
            }
          />
        </div>
      

      <PageBody className="bg-sidebar sticky flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 gap-0">
          <EmployeesDirectoryCard
            employees={controller.employees}
            hasFilters={controller.hasEmployeeFilters}
            isColumnVisible={isVisible}
            isLoading={controller.isEmployeesLoading}
            onDeleteRequested={controller.setEmployeeToDelete}
            onEditRequested={controller.onEditRequested}
            onPageChange={controller.onPageChange}
            pagination={controller.pagination}
            visibility={visibility}
          />
        </div>
      </PageBody>

      <AddEmployessDialog
        employee={controller.editingEmployee}
        isPending={controller.isEmployeeDialogPending}
        onOpenChange={controller.onEmployeeDialogOpenChange}
        onSubmitEmployee={controller.onSubmitEmployee}
        open={controller.isDialogOpen}
        options={controller.employeeOptions}
      />

      <DeleteEmployeeDialog
        employee={controller.employeeToDelete}
        isPending={controller.isDeletingEmployee}
        onConfirm={controller.onConfirmDeleteEmployee}
        onOpenChange={controller.onDeleteDialogOpenChange}
        open={Boolean(controller.employeeToDelete)}
      />
    </>
  );
}
