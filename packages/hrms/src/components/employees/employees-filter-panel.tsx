'use client';

import { Button } from '@kit/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import {
  type EmployeeStatusFilter,
  employeeStatusOptions,
} from '../../pages/employees/page.data';

export function EmployeesFilterPanel(props: {
  hasEmployeeFilters: boolean;
  onResetFilters: () => void;
  onStatusFilterChange: (value: string) => void;
  statusFilter: EmployeeStatusFilter;
}) {
  return (
    <div
      className={
        'bg-card flex shrink-0 flex-col gap-4 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between'
      }
    >
      <div className={'grid gap-2 sm:w-[260px]'}>
        <label
          className={'text-sm font-medium'}
          htmlFor={'employee-status-filter'}
        >
          Status
        </label>
        <Select
          value={props.statusFilter}
          onValueChange={props.onStatusFilterChange}
        >
          <SelectTrigger id={'employee-status-filter'}>
            <SelectValue placeholder={'Select status'} />
          </SelectTrigger>
          <SelectContent>
            {employeeStatusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant={'outline'}
        onClick={props.onResetFilters}
        disabled={!props.hasEmployeeFilters}
      >
        Clear filters
      </Button>
    </div>
  );
}
