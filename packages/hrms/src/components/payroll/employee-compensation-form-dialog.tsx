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
  createEmployeeCompensationService,
  listSalaryStructureComponentsService,
  listSalaryStructuresService,
  updateEmployeeCompensationService,
} from '../../server/services/payroll.service';
import { handleApiResponse } from '../../utils/api-response-handler';

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

const EMPTY_FORM = {
  employee_id: '',
  salary_structure_id: '',
  assignment_type: 'primary' as const,
  pay_frequency: 'monthly' as const,
  annual_ctc: '',
  monthly_gross: '',
  effective_from: new Date().toISOString().split('T')[0],
  effective_to: '',
  notes: '',
};

export function EmployeeCompensationFormDialog(props: {
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

  const salaryStructuresQuery = useQuery({
    queryKey: ['salary-structures'],
    queryFn: listSalaryStructuresService,
    enabled: props.open,
  });

  // Fetch structure components for preview
  const structureId =
    form.salary_structure_id && form.salary_structure_id !== 'none'
      ? form.salary_structure_id
      : null;
  const structureComponentsQuery = useQuery({
    queryKey: ['salary-structure-components', structureId],
    queryFn: () => listSalaryStructureComponentsService(structureId!),
    enabled: !!structureId && props.open,
  });

  const mutation = useMutation({
    mutationFn: (values: any) =>
      isEditing
        ? updateEmployeeCompensationService(props.initialData.id, values)
        : createEmployeeCompensationService(values),
    onSuccess: async (response) => {
      handleApiResponse(response);
      setForm(EMPTY_FORM);
      props.onOpenChange(false);
      await queryClient.invalidateQueries({
        queryKey: ['employee-compensation'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['payroll-dashboard'],
      });
    },
  });

  useEffect(() => {
    if (props.open) {
      if (props.initialData) {
        setForm({
          employee_id: props.initialData.employee_id || '',
          salary_structure_id: props.initialData.salary_structure_id || 'none',
          assignment_type: props.initialData.assignment_type || 'primary',
          pay_frequency: props.initialData.pay_frequency || 'monthly',
          annual_ctc: props.initialData.annual_ctc?.toString() || '',
          monthly_gross: props.initialData.monthly_gross?.toString() || '',
          effective_from:
            props.initialData.effective_from ||
            new Date().toISOString().split('T')[0],
          effective_to: props.initialData.effective_to || '',
          notes: props.initialData.notes || '',
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [props.open, props.initialData]);

  const handleAnnualCTCChange = (value: string) => {
    const annual = Number(value);
    const monthly = annual > 0 ? (annual / 12).toFixed(2) : '';
    setForm({ ...form, annual_ctc: value, monthly_gross: monthly });
  };

  const handleMonthlyGrossChange = (value: string) => {
    const monthly = Number(value);
    const annual = monthly > 0 ? (monthly * 12).toFixed(2) : '';
    setForm({ ...form, monthly_gross: value, annual_ctc: annual });
  };

  // Preview Logic
  const components = (structureComponentsQuery.data?.data as any[]) || [];
  const monthlyCTC = Number(form.annual_ctc || 0) / 12;
  const monthlyGross = Number(form.monthly_gross || 0);

  const previewItems = components.map((comp) => {
    let amount = 0;
    const calcValue = Number(comp.calculation_value || 0);
    const calcType = comp.calculation_type;

    if (calcType === 'fixed_amount') {
      amount = calcValue;
    } else if (calcType === 'percentage_of_ctc') {
      amount = (calcValue / 100) * monthlyCTC;
    } else if (calcType === 'percentage_of_gross') {
      amount = (calcValue / 100) * monthlyGross;
    }

    return {
      name: comp.salary_component?.name || 'Unknown',
      type: comp.salary_component?.type || 'earning',
      amount,
    };
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({
      employee_id: form.employee_id,
      salary_structure_id: structureId ?? undefined,
      assignment_type: form.assignment_type,
      pay_frequency: form.pay_frequency,
      annual_ctc: form.annual_ctc ? Number(form.annual_ctc) : undefined,
      monthly_gross: form.monthly_gross
        ? Number(form.monthly_gross)
        : undefined,
      effective_from: form.effective_from,
      effective_to: form.effective_to || undefined,
      notes: form.notes || undefined,
    });
  };

  const employees = (employeesQuery.data?.data as any[]) || [];
  const salaryStructures = (salaryStructuresQuery.data?.data as any[]) || [];

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-[560px] dark:border-slate-800 dark:bg-slate-950">
        <form className="flex max-h-[90vh] flex-col" onSubmit={onSubmit}>
          <DialogHeader className="border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950">
            <DialogTitle className="text-2xl pr-12">
              {isEditing
                ? 'Edit Compensation Assignment'
                : 'Assign Compensation to Employee'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the parameters of this employee compensation'
                : 'Create a new compensation assignment for an employee'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
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

              <div>
                <Label htmlFor="salary_structure_id">Salary Structure</Label>
                <Select
                  value={form.salary_structure_id}
                  disabled={isEditing}
                  onValueChange={(value) =>
                    setForm({ ...form, salary_structure_id: value })
                  }
                >
                  <SelectTrigger id="salary_structure_id">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {salaryStructures.map((structure: any) => (
                      <SelectItem key={structure.id} value={structure.id}>
                        {structure.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assignment_type">Assignment Type *</Label>
                <Select
                  value={form.assignment_type}
                  onValueChange={(value: any) =>
                    setForm({ ...form, assignment_type: value })
                  }
                >
                  <SelectTrigger id="assignment_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="retainer">Retainer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="pay_frequency">Pay Frequency *</Label>
                <Select
                  value={form.pay_frequency}
                  onValueChange={(value: any) =>
                    setForm({ ...form, pay_frequency: value })
                  }
                >
                  <SelectTrigger id="pay_frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="one_time">One Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="annual_ctc">Annual CTC</Label>
                <Input
                  id="annual_ctc"
                  type="number"
                  placeholder="e.g. 600000"
                  step="1000"
                  min="0"
                  value={form.annual_ctc}
                  onChange={(e) => handleAnnualCTCChange(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="monthly_gross">Monthly Gross</Label>
                <Input
                  id="monthly_gross"
                  type="number"
                  placeholder="e.g. 50000"
                  step="1000"
                  min="0"
                  value={form.monthly_gross}
                  onChange={(e) => handleMonthlyGrossChange(e.target.value)}
                />
              </div>
            </div>

            {/* Salary Breakdown Preview */}
            {structureId && previewItems.length > 0 && (
              <div className="bg-muted/30 space-y-3 rounded-lg border p-4">
                <h4 className="flex items-center justify-between text-sm font-semibold">
                  Salary Breakdown Preview
                  <span className="text-muted-foreground text-xs font-normal">
                    (Monthly)
                  </span>
                </h4>
                <div className="max-h-[200px] space-y-2 overflow-y-auto">
                  {previewItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{item.name}</span>
                      <span
                        className={
                          item.type === 'deduction'
                            ? 'text-destructive'
                            : 'font-medium'
                        }
                      >
                        {item.type === 'deduction' ? '-' : ''}
                        {new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        }).format(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between border-t pt-2 text-sm font-bold">
                  <span>Estimated Net Payment</span>
                  <span className="text-primary">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                    }).format(
                      previewItems.reduce(
                        (acc, curr) =>
                          acc +
                          (curr.type === 'deduction'
                            ? -curr.amount
                            : curr.type === 'earning'
                              ? curr.amount
                              : 0),
                        0,
                      ),
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="effective_from">Effective From *</Label>
                <Input
                  id="effective_from"
                  type="date"
                  required
                  value={form.effective_from}
                  onChange={(e) =>
                    setForm({ ...form, effective_from: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="effective_to">Effective To</Label>
                <Input
                  id="effective_to"
                  type="date"
                  value={form.effective_to}
                  onChange={(e) =>
                    setForm({ ...form, effective_to: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Add any additional notes"
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
                  : 'Assigning...'
                : isEditing
                  ? 'Save Changes'
                  : 'Assign Compensation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
