'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { Plus } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import type {
  Employee,
  EmployeeEmploymentType,
  EmployeeFormPayload,
  EmployeeOptions,
  EmployeeStatus,
} from '../../types/employee.type';
import {
  EMPTY_FORM,
  buildEmployeePayload,
  createEmployeeFormState,
  employmentTypeLabels,
  statusLabels,
} from './add-employees.utils';
import type { EmployeeFormState } from './add-employees.utils';

export function AddEmployeeButton(props: { onClick: () => void }) {
  return (
    <Button size={'sm'} className={'w-full sm:w-auto'} onClick={props.onClick}>
      <Plus className={'mr-1.5 h-3.5 w-3.5'} />
      Add Employee
    </Button>
  );
}

export function AddEmployessDialog(props: {
  employee?: Employee | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitEmployee: (employee: EmployeeFormPayload) => void;
  open: boolean;
  options: EmployeeOptions;
}) {
  const [form, setForm] = useState<EmployeeFormState>(EMPTY_FORM);

  useEffect(() => {
    if (!props.open) {
      return;
    }

    setForm(createEmployeeFormState(props.employee));
  }, [props.employee, props.open]);

  const selectableManagers = useMemo(() => {
    return props.options.managers.filter(
      (manager) => manager.id !== props.employee?.id,
    );
  }, [props.employee?.id, props.options.managers]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    props.onSubmitEmployee(buildEmployeePayload(form));
  };

  const isEditing = Boolean(props.employee);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        className={'max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-[720px] dark:border-slate-800 dark:bg-slate-950'}
      >
        <form className={'flex max-h-[90vh] flex-col'} onSubmit={onSubmit}>
          <DialogHeader className={'border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950'}>
            <DialogTitle className={'text-3xl pr-12'}>
              {isEditing ? 'Edit Employee' : 'Add Employee'}
            </DialogTitle>
            <DialogDescription className={'text-base'}>
              {isEditing
                ? 'Update employee details and organization assignment.'
                : 'Invite a new user as an employee.'}
            </DialogDescription>
          </DialogHeader>

          <div className={'flex-1 overflow-y-auto p-6 space-y-4'}>
            <div className={'grid gap-4 sm:grid-cols-2'}>
              <div className={'space-y-2'}>
                <Label htmlFor={'first_name'}>First Name</Label>
                <Input
                  id={'first_name'}
                  required
                  value={form.first_name}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      first_name: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={'space-y-2'}>
                <Label htmlFor={'last_name'}>Last Name</Label>
                <Input
                  id={'last_name'}
                  value={form.last_name ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      last_name: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className={'grid gap-4 sm:grid-cols-2'}>
              <div className={'space-y-2'}>
                <Label htmlFor={'work_email'}>Work Email</Label>
                <Input
                  id={'work_email'}
                  required
                  type={'email'}
                  value={form.work_email}
                  readOnly={form.assignmentMode === 'existing' && !isEditing}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      work_email: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={'space-y-2'}>
                <Label htmlFor={'phone'}>Phone</Label>
                <Input
                  id={'phone'}
                  value={form.phone ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className={'grid gap-4 sm:grid-cols-2'}>
              <div className={'space-y-2'}>
                <Label htmlFor={'employee_code'}>Employee Code</Label>
                <Input
                  id={'employee_code'}
                  required
                  value={form.employee_code}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      employee_code: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>

              <div className={'space-y-2'}>
                <Label htmlFor={'designation'}>Designation</Label>
                <Input
                  id={'designation'}
                  value={form.designation ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      designation: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className={'grid gap-4 sm:grid-cols-2'}>
              <div className={'space-y-2'}>
                <Label>Department</Label>
                <Select
                  value={form.department_id ?? '__none__'}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      department_id: value === '__none__' ? null : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={'Select department'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={'__none__'}>No Department</SelectItem>
                    {props.options.departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={'space-y-2'}>
                <Label>Role</Label>
                <Select
                  value={form.role_id ?? '__none__'}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      role_id: value === '__none__' ? null : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={'Select role'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={'__none__'}>No Role</SelectItem>
                    {props.options.roles?.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.role_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={'grid gap-4 sm:grid-cols-2'}>
              <div className={'space-y-2'}>
                <Label>Manager</Label>
                <Select
                  value={form.manager_employee_id ?? '__none__'}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      manager_employee_id: value === '__none__' ? null : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={'Select manager'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={'__none__'}>No Manager</SelectItem>
                    {selectableManagers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name} ({manager.employee_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={'space-y-2'}>
                <Label>Shift</Label>
                <Select
                  value={form.shift_id ?? '__none__'}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      shift_id: value === '__none__' ? null : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={'Select shift'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={'__none__'}>No Shift</SelectItem>
                    {props.options.shifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id}>
                        {shift.name}
                        {shift.is_active ? '' : ' (Inactive)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={'grid gap-4 sm:grid-cols-3'}>
              <div className={'space-y-2'}>
                <Label>Employment Type</Label>
                <Select
                  value={form.employment_type}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      employment_type: value as EmployeeEmploymentType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={'Select employment type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(employmentTypeLabels).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className={'space-y-2'}>
                <Label>Status</Label>
                <Select
                  disabled={form.assignmentMode === 'invite' && !isEditing}
                  value={
                    form.assignmentMode === 'invite' && !isEditing
                      ? 'invited'
                      : form.status
                  }
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      status: value as EmployeeStatus,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={'Select status'} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={'space-y-2'}>
                <Label htmlFor={'joining_date'}>Joining Date</Label>
                <Input
                  id={'joining_date'}
                  required
                  type={'date'}
                  value={form.joining_date ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      joining_date: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className={'border-t border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950'}>
            <Button
              type={'button'}
              variant={'outline'}
              disabled={props.isPending}
              onClick={() => props.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type={'submit'} disabled={props.isPending}>
              {props.isPending
                ? isEditing
                  ? 'Saving...'
                  : form.assignmentMode === 'invite'
                    ? 'Inviting...'
                    : 'Adding...'
                : isEditing
                  ? 'Save Employee'
                  : form.assignmentMode === 'invite'
                    ? 'Invite Employee'
                    : 'Add Employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
