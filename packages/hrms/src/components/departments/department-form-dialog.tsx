'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

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

import type {
  Department,
  DepartmentFormPayload,
  DepartmentOptions,
} from '../../types/department.type';

const EMPTY_FORM: DepartmentFormPayload = {
  name: '',
  code: '',
  cost_center_code: '',
  head_account_id: null,
  parent_department_id: null,
  is_active: true,
};

type DepartmentFormDialogProps = {
  department?: Department | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: DepartmentFormPayload) => void;
  open: boolean;
  options: DepartmentOptions;
};

export function DepartmentFormDialog(props: DepartmentFormDialogProps) {
  const [form, setForm] = useState<DepartmentFormPayload>(EMPTY_FORM);

  useEffect(() => {
    if (!props.open) {
      return;
    }

    if (!props.department) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      name: props.department.name,
      code: props.department.code,
      cost_center_code: props.department.cost_center_code ?? '',
      head_account_id: props.department.head_account_id,
      parent_department_id: props.department.parent_department_id,
      is_active: props.department.is_active,
    });
  }, [props.department, props.open]);

  const parentDepartmentOptions = useMemo(() => {
    return props.options.departments.filter(
      (department) => department.id !== props.department?.id,
    );
  }, [props.department?.id, props.options.departments]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    props.onSubmit({
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      cost_center_code: form.cost_center_code?.trim() || null,
      head_account_id: form.head_account_id || null,
      parent_department_id: form.parent_department_id || null,
      is_active: form.is_active ?? true,
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className={'sm:max-w-[620px]'}>
        <form className={'space-y-5'} onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle className={'text-2xl'}>
              {props.department ? 'Edit Department' : 'Add Department'}
            </DialogTitle>
            <DialogDescription className={'text-base'}>
              {props.department
                ? 'Update the department details and hierarchy.'
                : 'Create a department under your organization.'}
            </DialogDescription>
          </DialogHeader>

          <div className={'grid gap-4 sm:grid-cols-2'}>
            <div className={'space-y-2'}>
              <Label htmlFor={'department-name'}>Department Name</Label>
              <Input
                id={'department-name'}
                placeholder={'Engineering'}
                required
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>

            <div className={'space-y-2'}>
              <Label htmlFor={'department-code'}>Code</Label>
              <Input
                id={'department-code'}
                placeholder={'ENG'}
                required
                maxLength={20}
                value={form.code}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    code: event.target.value.toUpperCase(),
                  }))
                }
              />
            </div>

            <div className={'space-y-2'}>
              <Label>Parent Department</Label>
              <Select
                value={form.parent_department_id ?? '__none__'}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    parent_department_id: value === '__none__' ? null : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={'Select parent department'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={'__none__'}>No Parent</SelectItem>
                  {parentDepartmentOptions.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name} ({department.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={'space-y-2'}>
              <Label>Department Head</Label>
              <Select
                value={form.head_account_id ?? '__none__'}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    head_account_id: value === '__none__' ? null : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={'Select department head'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={'__none__'}>No Head Assigned</SelectItem>
                  {props.options.headAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                      {account.email ? ` (${account.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={'space-y-2 sm:col-span-2'}>
              <Label htmlFor={'cost-center-code'}>Cost Center Code</Label>
              <Input
                id={'cost-center-code'}
                placeholder={'CC-ENG-01'}
                value={form.cost_center_code ?? ''}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    cost_center_code: event.target.value,
                  }))
                }
              />
            </div>

            <div
              className={
                'flex items-center justify-between rounded-lg border px-4 py-3 sm:col-span-2'
              }
            >
              <div>
                <p className={'font-medium'}>Active Department</p>
                <p className={'text-muted-foreground text-sm'}>
                  Inactive departments remain in history but are hidden from
                  active operations.
                </p>
              </div>
              <Switch
                checked={form.is_active ?? true}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, is_active: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
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
                ? props.department
                  ? 'Saving...'
                  : 'Creating...'
                : props.department
                  ? 'Save Changes'
                  : 'Create Department'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
