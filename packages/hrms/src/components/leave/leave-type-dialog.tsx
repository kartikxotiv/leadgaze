'use client';

import { useEffect, useState } from 'react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';

import type { LeaveType, LeaveTypePayload } from '../../types/leave.type';

type LeaveTypeDialogState = LeaveTypePayload;

const DEFAULT_FORM: LeaveTypeDialogState = {
  annual_allocation: 0,
  can_carry_forward: false,
  code: '',
  description: '',
  is_active: true,
  name: '',
  requires_hr_approval: false,
};

export function LeaveTypeDialog(props: {
  isPending: boolean;
  leaveType: LeaveType | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: LeaveTypePayload) => void;
  open: boolean;
}) {
  const [form, setForm] = useState<LeaveTypeDialogState>(DEFAULT_FORM);

  useEffect(() => {
    if (!props.open) {
      setForm(DEFAULT_FORM);
      return;
    }

    if (!props.leaveType) {
      setForm(DEFAULT_FORM);
      return;
    }

    setForm({
      annual_allocation: props.leaveType.annual_allocation,
      can_carry_forward: props.leaveType.can_carry_forward,
      code: props.leaveType.code,
      description: props.leaveType.description ?? '',
      is_active: props.leaveType.is_active,
      name: props.leaveType.name,
      requires_hr_approval: props.leaveType.requires_hr_approval,
    });
  }, [props.leaveType, props.open]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className={'sm:max-w-[560px]'}>
        <div className={'flex flex-col gap-6'}>
          <DialogHeader>
            <DialogTitle className={'text-2xl'}>
              {props.leaveType ? 'Edit Leave Type' : 'Create Leave Type'}
            </DialogTitle>
            <DialogDescription className={'text-base'}>
              Configure available leave categories and approval rules.
            </DialogDescription>
          </DialogHeader>

          <div className={'grid gap-4'}>
            <div className={'grid gap-4 sm:grid-cols-2'}>
              <div className={'grid gap-2'}>
                <p className={'text-sm font-medium'}>Code</p>
                <Input
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      code: event.target.value,
                    }))
                  }
                  placeholder={'CASUAL'}
                />
              </div>

              <div className={'grid gap-2'}>
                <p className={'text-sm font-medium'}>Name</p>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder={'Casual Leave'}
                />
              </div>
            </div>

            <div className={'grid gap-4 sm:grid-cols-2'}>
              <div className={'grid gap-2'}>
                <p className={'text-sm font-medium'}>Annual Allocation</p>
                <Input
                  min={0}
                  type={'number'}
                  value={form.annual_allocation}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      annual_allocation: Number(event.target.value || 0),
                    }))
                  }
                />
              </div>

              <div className={'grid gap-2'}>
                <p className={'text-sm font-medium'}>Requires HR Approval</p>
                <Select
                  value={form.requires_hr_approval ? 'yes' : 'no'}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      requires_hr_approval: value === 'yes',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={'no'}>No</SelectItem>
                    <SelectItem value={'yes'}>Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={'grid gap-2'}>
              <p className={'text-sm font-medium'}>Carry Forward</p>
              <Select
                value={form.can_carry_forward ? 'yes' : 'no'}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    can_carry_forward: value === 'yes',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={'no'}>No</SelectItem>
                  <SelectItem value={'yes'}>Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={'grid gap-2'}>
              <p className={'text-sm font-medium'}>Description</p>
              <Textarea
                rows={4}
                value={form.description ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder={'Describe when this leave type should be used'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant={'outline'}
              onClick={() => props.onOpenChange(false)}
              disabled={props.isPending}
            >
              Cancel
            </Button>

            <Button
              disabled={
                props.isPending || !form.code.trim() || !form.name.trim()
              }
              onClick={() => props.onSubmit(form)}
            >
              {props.isPending ? 'Saving...' : 'Save Leave Type'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
