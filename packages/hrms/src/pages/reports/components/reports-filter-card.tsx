import { FilterX, RefreshCcw } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import type { ReportsPageController } from '../../../hooks/use-reports-page';
import { EmployeeMultiSelect } from '../page.components';

export function ReportsFilterCard(props: { page: ReportsPageController }) {
  const { page } = props;

  return (
    <CardWidgetContainer
      title="Report Filters"
      desc="Adjust date, department, shift, and employee scope before exporting."
      contentClassName="grid gap-4 p-4"
    >
      <div className="grid gap-4 overflow-hidden">
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))]">
          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium">From</label>
            <Input
              type="date"
              value={page.draftFilters.from}
              onChange={(event) =>
                page.setDraftFilters((current) => ({
                  ...current,
                  from: event.target.value,
                }))
              }
            />
          </div>

          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium">To</label>
            <Input
              type="date"
              value={page.draftFilters.to}
              onChange={(event) =>
                page.setDraftFilters((current) => ({
                  ...current,
                  to: event.target.value,
                }))
              }
            />
          </div>

          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium">Department</label>
            <Select
              value={page.draftFilters.departmentId ?? 'all'}
              onValueChange={(value) =>
                page.setDraftFilters((current) => ({
                  ...current,
                  departmentId: value === 'all' ? null : value,
                }))
              }
            >
              <SelectTrigger className="min-w-0">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {(page.dashboardData?.options.departments ?? []).map(
                  (department) => (
                    <SelectItem
                      key={department.id}
                      value={department.id}
                      className="max-w-[min(24rem,var(--radix-select-trigger-width))]"
                    >
                      <span className="truncate">{department.label}</span>
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium">Shift</label>
            <Select
              value={page.draftFilters.shiftId ?? 'all'}
              onValueChange={(value) =>
                page.setDraftFilters((current) => ({
                  ...current,
                  shiftId: value === 'all' ? null : value,
                }))
              }
            >
              <SelectTrigger className="min-w-0">
                <SelectValue placeholder="All shifts" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All shifts</SelectItem>
                {(page.dashboardData?.options.shifts ?? []).map((shift) => (
                  <SelectItem
                    key={shift.id}
                    value={shift.id}
                    className="max-w-[min(24rem,var(--radix-select-trigger-width))]"
                  >
                    <span className="truncate">{shift.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium">Employees</label>
            <EmployeeMultiSelect
              options={page.employeeOptions}
              selectedIds={page.draftFilters.employeeIds ?? []}
              onToggle={page.toggleEmployee}
              onClear={page.clearEmployees}
              onSelectAll={page.selectAllVisibleEmployees}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={page.applyFilters}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Apply Filters
          </Button>
          <Button variant="outline" onClick={page.resetFilters}>
            <FilterX className="mr-2 h-4 w-4" />
            Reset
          </Button>
          {page.dashboardData?.filters ? (
            <p className="text-muted-foreground text-sm">
              Showing {page.dashboardData.filters.appliedEmployeeCount} of{' '}
              {page.dashboardData.filters.totalAccessibleEmployees} accessible
              employees.
            </p>
          ) : null}
        </div>
      </div>
    </CardWidgetContainer>
  );
}
