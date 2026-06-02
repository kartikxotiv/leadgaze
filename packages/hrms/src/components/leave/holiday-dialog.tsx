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

import type { LeaveHoliday, LeaveHolidayPayload } from '~/types/leave.type';

type HolidayDialogState = LeaveHolidayPayload;

const DEFAULT_FORM: HolidayDialogState = {
  description: '',
  holiday_date: '',
  is_optional: false,
  name: '',
};

export function HolidayDialog(props: {
  holiday: LeaveHoliday | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: LeaveHolidayPayload) => void;
  open: boolean;
}) {
  const [form, setForm] = useState<HolidayDialogState>(DEFAULT_FORM);

  useEffect(() => {
    if (!props.open) {
      setForm(DEFAULT_FORM);
      return;
    }

    if (!props.holiday) {
      setForm(DEFAULT_FORM);
      return;
    }

    setForm({
      description: props.holiday.description ?? '',
      holiday_date: props.holiday.holiday_date,
      is_optional: props.holiday.is_optional,
      name: props.holiday.name,
    });
  }, [props.holiday, props.open]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className={'sm:max-w-[560px]'}>
        <div className={'flex flex-col gap-6'}>
          <DialogHeader>
            <DialogTitle className={'text-2xl'}>
              {props.holiday ? 'Edit Holiday' : 'Add Holiday'}
            </DialogTitle>
            <DialogDescription className={'text-base'}>
              Keep the holiday calendar in sync so leave calculations stay accurate.
            </DialogDescription>
          </DialogHeader>

          <div className={'grid gap-4'}>
            <div className={'grid gap-4 sm:grid-cols-2'}>
              <div className={'grid gap-2'}>
                <p className={'text-sm font-medium'}>Holiday Date</p>
                <Input
                  type={'date'}
                  value={form.holiday_date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      holiday_date: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={'grid gap-2'}>
                <p className={'text-sm font-medium'}>Optional Holiday</p>
                <Select
                  value={form.is_optional ? 'yes' : 'no'}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      is_optional: value === 'yes',
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
              <p className={'text-sm font-medium'}>Holiday Name</p>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder={'Republic Day'}
              />
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
                placeholder={'Optional note for the holiday calendar'}
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
              disabled={props.isPending || !form.holiday_date || !form.name.trim()}
              onClick={() => props.onSubmit(form)}
            >
              {props.isPending ? 'Saving...' : 'Save Holiday'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
