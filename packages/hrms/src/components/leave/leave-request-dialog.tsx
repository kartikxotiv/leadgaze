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

import type {
  LeaveRequestCreatePayload,
  LeaveType,
} from '../../types/leave.type';

type LeaveRequestDialogState = LeaveRequestCreatePayload;

const DEFAULT_FORM: LeaveRequestDialogState = {
  from_date: '',
  leave_type_id: '',
  reason: '',
  to_date: '',
};

export function LeaveRequestDialog(props: {
  isPending: boolean;
  leaveTypes: LeaveType[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: LeaveRequestCreatePayload) => void;
  open: boolean;
}) {
  const [form, setForm] = useState<LeaveRequestDialogState>(DEFAULT_FORM);

  useEffect(() => {
    if (!props.open) {
      setForm(DEFAULT_FORM);
      return;
    }

    const firstActiveLeaveType = props.leaveTypes.find(
      (leaveType) => leaveType.is_active,
    );

    setForm({
      ...DEFAULT_FORM,
      leave_type_id: firstActiveLeaveType?.id ?? '',
    });
  }, [props.leaveTypes, props.open]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-[560px] dark:border-slate-800 dark:bg-slate-950">
        <div className="flex max-h-[90vh] flex-col gap-0">
          <DialogHeader className="border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950">
            <DialogTitle className="text-2xl pr-12">Apply For Leave</DialogTitle>
            <DialogDescription className="text-base">
              Submit a leave request with dates, leave type, and reason.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className={'grid gap-4'}>
              <div className={'grid gap-2'}>
                <p className={'text-sm font-medium'}>Leave Type</p>
                <Select
                  value={form.leave_type_id}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      leave_type_id: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={'Select leave type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {props.leaveTypes
                      .filter((leaveType) => leaveType.is_active)
                      .map((leaveType) => (
                        <SelectItem key={leaveType.id} value={leaveType.id}>
                          {leaveType.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={'grid gap-4 sm:grid-cols-2'}>
                <div className={'grid gap-2'}>
                  <p className={'text-sm font-medium'}>From</p>
                  <Input
                    type={'date'}
                    value={form.from_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        from_date: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className={'grid gap-2'}>
                  <p className={'text-sm font-medium'}>To</p>
                  <Input
                    type={'date'}
                    value={form.to_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        to_date: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className={'grid gap-2'}>
                <p className={'text-sm font-medium'}>Reason</p>
                <Textarea
                  rows={4}
                  value={form.reason ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  placeholder={'Add a short reason for your leave request'}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <Button
              variant={'outline'}
              onClick={() => props.onOpenChange(false)}
              disabled={props.isPending}
            >
              Cancel
            </Button>

            <Button
              disabled={
                props.isPending ||
                !form.leave_type_id ||
                !form.from_date ||
                !form.to_date
              }
              onClick={() => props.onSubmit(form)}
            >
              {props.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
