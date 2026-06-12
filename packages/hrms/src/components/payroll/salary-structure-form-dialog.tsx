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
import { Textarea } from '@kit/ui/textarea';

import {
  createSalaryStructureService,
  updateSalaryStructureService,
} from '../../server/services/payroll.service';
import { handleApiResponse } from '../../utils/api-response-handler';

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

const EMPTY_FORM = {
  name: '',
  description: '',
  currency_code: 'INR',
  is_active: true,
};

export function SalaryStructureFormDialog(props: {
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
        ? updateSalaryStructureService(props.initialData.id, values)
        : createSalaryStructureService(values),
    onSuccess: async (response) => {
      handleApiResponse(response);
      setForm(EMPTY_FORM);
      props.onOpenChange(false);
      await queryClient.invalidateQueries({
        queryKey: ['salary-structures'],
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
          name: props.initialData.name || '',
          description: props.initialData.description || '',
          currency_code: props.initialData.currency_code || 'INR',
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
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      currency_code: form.currency_code,
      is_active: form.is_active,
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-[560px] dark:border-slate-800 dark:bg-slate-950">
        <form className="flex max-h-[90vh] flex-col" onSubmit={onSubmit}>
          <DialogHeader className="border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950">
            <DialogTitle className="text-2xl pr-12">
              {isEditing ? 'Edit Salary Structure' : 'Create Salary Structure'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the details of this salary structure'
                : 'Define a new salary structure template for your organization'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                required
                placeholder="e.g. Executive Salary, Staff Salary"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe this salary structure and its usage"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currency">Currency *</Label>
                <Select
                  value={form.currency_code}
                  onValueChange={(value) =>
                    setForm({ ...form, currency_code: value })
                  }
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <div className="flex items-center gap-2">
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
                  : 'Create Structure'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
