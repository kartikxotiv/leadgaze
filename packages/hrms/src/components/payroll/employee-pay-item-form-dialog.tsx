/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { FormEvent, useEffect, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

import { listEmployeesService } from '../../server/services/employee.service';
import {
  createEmployeePayItemService,
  listSalaryComponentsService,
  updateEmployeePayItemService,
} from '../../server/services/payroll.service';
import { handleApiResponse } from '../../utils/api-response-handler';

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

const EMPTY_FORM = {
  employee_id: '',
  salary_component_id: '',
  amount: '',
  effective_date: new Date().toISOString().split('T')[0],
  notes: '',
};

export function EmployeePayItemFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const queryClient = useQueryClient();
  const isEditing = !!props.initialData;

  const employeesQuery = useQuery({
    queryKey: ['employees-list'],
    queryFn: listEmployeesService,
    enabled: props.open,
  });

  const componentsQuery = useQuery({
    queryKey: ['salary-components'],
    queryFn: listSalaryComponentsService,
    enabled: props.open,
  });

  const mutation = useMutation({
    mutationFn: (values: any) =>
      isEditing
        ? updateEmployeePayItemService(props.initialData.id, values)
        : createEmployeePayItemService(values),
    onSuccess: async (response) => {
      handleApiResponse(response);
      setForm(EMPTY_FORM);
      props.onOpenChange(false);
      await queryClient.invalidateQueries({
        queryKey: ['payroll-dashboard'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['employee-pay-items'],
      });
    },
  });

  useEffect(() => {
    if (props.open) {
      if (props.initialData) {
        setForm({
          employee_id: props.initialData.employee_id || '',
          salary_component_id: props.initialData.salary_component_id || '',
          amount: props.initialData.amount?.toString() || '',
          effective_date:
            props.initialData.effective_date ||
            new Date().toISOString().split('T')[0],
          notes: props.initialData.notes || '',
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [props.open, props.initialData]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({
      employee_id: form.employee_id,
      salary_component_id: form.salary_component_id,
      amount: Number(form.amount),
      effective_date: form.effective_date,
      notes: form.notes || undefined,
    });
  };

  const employees = (employeesQuery.data?.data as any[]) || [];
  const components = (componentsQuery.data?.data as any[]) || [];

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-[450px] dark:border-slate-800 dark:bg-slate-950">
        <form className="flex max-h-[90vh] flex-col" onSubmit={onSubmit}>
          <DialogHeader className="border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950">
            <DialogTitle className="pr-12">
              {isEditing ? 'Edit Pay Item' : 'Add One-Time Pay Item'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the details of this one-time pay item'
                : 'Create a bonus, reimbursement, or one-time deduction for an employee.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee *</Label>
              <Select
                value={form.employee_id}
                disabled={isEditing}
                onValueChange={(value) =>
                  setForm({ ...form, employee_id: value })
                }
              >
                <SelectTrigger id="employee_id">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary_component_id">Reason / Component *</Label>
              <Select
                value={form.salary_component_id}
                disabled={isEditing}
                onValueChange={(value) =>
                  setForm({ ...form, salary_component_id: value })
                }
              >
                <SelectTrigger id="salary_component_id">
                  <SelectValue placeholder="e.g. Bonus, Advance" />
                </SelectTrigger>
                <SelectContent>
                  {components.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="effective_date">Date *</Label>
                <Input
                  id="effective_date"
                  type="date"
                  required
                  value={form.effective_date}
                  onChange={(e) =>
                    setForm({ ...form, effective_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Optional description"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <Button
              type="button"
              variant="outline"
              onClick={() => props.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? isEditing
                  ? 'Updating...'
                  : 'Adding...'
                : isEditing
                  ? 'Save Changes'
                  : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
