'use client';

import { Filter, Search, X } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';

import {
  AddEmployeeButton,
  AddEmployessDialog,
} from '../../components/employees/add-employees';
import { DeleteEmployeeDialog } from '../../components/employees/delete-employee-dialog';
import { EmployeesDirectoryCard } from '../../components/employees/employees-directory-card';
import { EmployeesFilterPanel } from '../../components/employees/employees-filter-panel';
import { EmployeesSummaryCards } from '../../components/employees/employees-summary-cards';
import { useEmployeesPage } from '../../hooks/use-employees-page';

export function EmployeesPage() {
  const controller = useEmployeesPage();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <EmployeesSummaryCards summary={controller.summary} />

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {controller.isSearchVisible ? (
            <div className="relative">
              <Input
                className="h-9 w-full pr-9 sm:w-[280px]"
                placeholder="Search employees"
                value={controller.searchTerm}
                onChange={(event) =>
                  controller.onSearchTermChange(event.target.value)
                }
              />
              <Button
                aria-label="Close search"
                className="absolute right-0 top-0 h-9 w-9"
                size="icon"
                variant="ghost"
                onClick={() => {
                  controller.onSearchTermChange('');
                  controller.setIsSearchVisible(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              aria-label="Search employees"
              size="icon"
              variant="outline"
              onClick={() => controller.setIsSearchVisible(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}

          <Button
            aria-label="Filter employees"
            size="icon"
            variant={controller.isFiltersVisible ? 'default' : 'outline'}
            onClick={() =>
              controller.setIsFiltersVisible(!controller.isFiltersVisible)
            }
          >
            <Filter className="h-4 w-4" />
          </Button>

          {controller.canCreateEmployee ? (
            <AddEmployeeButton onClick={controller.onAddRequested} />
          ) : null}
        </div>
      </div>

      {controller.isFiltersVisible ? (
        <EmployeesFilterPanel
          hasEmployeeFilters={controller.hasEmployeeFilters}
          onResetFilters={controller.resetEmployeeFilters}
          onStatusFilterChange={controller.onStatusFilterChange}
          statusFilter={controller.statusFilter}
        />
      ) : null}

      <EmployeesDirectoryCard
        employees={controller.employees}
        hasFilters={controller.hasEmployeeFilters}
        isLoading={controller.isEmployeesLoading}
        onDeleteRequested={controller.setEmployeeToDelete}
        onEditRequested={controller.onEditRequested}
        onPageChange={controller.onPageChange}
        pagination={controller.pagination}
      />

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
    </section>
  );
}
