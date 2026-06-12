/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { FormEvent, useEffect, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

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
import { Switch } from '@kit/ui/switch';

import {
  createSalaryComponentService,
  updateSalaryComponentService,
} from '../../server/services/payroll.service';
import { handleApiResponse } from '../../utils/api-response-handler';

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

const COMPONENT_TYPES = {
  earning: 'Earning',
  deduction: 'Deduction',
  employer_contribution: 'Employer Contribution',
};

const EMPTY_FORM = {
  code: '',
  name: '',
  type: 'earning' as const,
  taxable: false,
  is_statutory: false,
  is_active: true,
};

export function SalaryComponentFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const queryClient = useQueryClient();
  const isEditing = !!props.initialData;

  const mutation = useMutation({
    mutationFn: (values: any) =>
      isEditing
        ? updateSalaryComponentService(props.initialData.id, values)
        : createSalaryComponentService(values),
    onSuccess: async (response) => {
      handleApiResponse(response);
      setForm(EMPTY_FORM);
      props.onOpenChange(false);
      await queryClient.invalidateQueries({
        queryKey: ['salary-components'],
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
          code: props.initialData.code || '',
          name: props.initialData.name || '',
          type: props.initialData.type || 'earning',
          taxable: props.initialData.taxable ?? false,
          is_statutory: props.initialData.is_statutory ?? false,
          is_active: props.initialData.is_active ?? true,
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [props.open, props.initialData]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      type: form.type,
      taxable: form.taxable,
      is_statutory: form.is_statutory,
      is_active: form.is_active,
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-[560px] dark:border-slate-800 dark:bg-slate-950">
        <form className="flex max-h-[90vh] flex-col" onSubmit={onSubmit}>
          <DialogHeader className="border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950">
            <DialogTitle className="text-2xl pr-12">
              {isEditing ? 'Edit Salary Component' : 'Create Salary Component'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the details of this salary component'
                : 'Add a new earning, deduction, or employer contribution component'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  required
                  placeholder="e.g. BASIC, HRA, DA, PF"
                  maxLength={10}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={form.type}
                  onValueChange={(value: any) =>
                    setForm({ ...form, type: value })
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COMPONENT_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                required
                placeholder="e.g. Basic Salary, House Rent Allowance"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="taxable">Taxable Income</Label>
                <Switch
                  id="taxable"
                  checked={form.taxable}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, taxable: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_statutory">Statutory Component</Label>
                <Switch
                  id="is_statutory"
                  checked={form.is_statutory}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, is_statutory: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={form.is_active}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, is_active: checked })
                  }
                />
              </div>
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
                  : 'Creating...'
                : isEditing
                  ? 'Save Changes'
                  : 'Create Component'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
