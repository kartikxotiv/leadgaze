'use client';

import { FormEvent, useEffect, useState } from 'react';

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
import { Switch } from '@kit/ui/switch';

import type { Shift, ShiftFormPayload } from '../../types/shift.type';

const EMPTY_FORM: ShiftFormPayload = {
  name: '',
  start_time: '09:00:00',
  end_time: '18:00:00',
  grace_minutes: 0,
  is_active: true,
};

export function ShiftFormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ShiftFormPayload) => void;
  isPending: boolean;
  shift?: Shift | null;
}) {
  const [form, setForm] = useState<ShiftFormPayload>(EMPTY_FORM);

  useEffect(() => {
    if (!props.open) return;

    if (!props.shift) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      name: props.shift.name,
      start_time: props.shift.start_time,
      end_time: props.shift.end_time,
      grace_minutes: props.shift.grace_minutes,
      is_active: props.shift.is_active,
    });
  }, [props.open, props.shift]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    props.onSubmit({
      name: form.name.trim(),
      start_time: normalizeTime(form.start_time),
      end_time: normalizeTime(form.end_time),
      grace_minutes: form.grace_minutes ?? 0,
      is_active: form.is_active ?? true,
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className={'max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-[560px] dark:border-slate-800 dark:bg-slate-950'}>
        <form className={'flex max-h-[90vh] flex-col'} onSubmit={onSubmit}>
          <DialogHeader className={'border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950'}>
            <DialogTitle className={'text-2xl pr-12'}>
              {props.shift ? 'Edit Shift' : 'Create Shift'}
            </DialogTitle>
            <DialogDescription className={'text-base'}>
              Define working hours and grace period for the organization.
            </DialogDescription>
          </DialogHeader>

          <div className={'flex-1 overflow-y-auto p-6 space-y-4'}>
            <div className={'space-y-2'}>
              <Label htmlFor={'shift-name'}>Shift Name</Label>
              <Input
                id={'shift-name'}
                placeholder={'General'}
                required
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>

            <div className={'grid gap-4 sm:grid-cols-2'}>
              <div className={'space-y-2'}>
                <Label htmlFor={'shift-start'}>Start Time</Label>
                <Input
                  id={'shift-start'}
                  type={'time'}
                  step={1}
                  required
                  value={toTimeInput(form.start_time)}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      start_time: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={'space-y-2'}>
                <Label htmlFor={'shift-end'}>End Time</Label>
                <Input
                  id={'shift-end'}
                  type={'time'}
                  step={1}
                  required
                  value={toTimeInput(form.end_time)}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      end_time: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className={'space-y-2'}>
              <Label htmlFor={'shift-grace'}>Grace Minutes</Label>
              <Input
                id={'shift-grace'}
                type={'number'}
                min={0}
                max={240}
                value={form.grace_minutes ?? 0}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    grace_minutes: Number(event.target.value || 0),
                  }))
                }
              />
            </div>

            <div
              className={
                'flex items-center justify-between rounded-lg border px-4 py-3'
              }
            >
              <div>
                <p className={'font-medium'}>Active Shift</p>
                <p className={'text-muted-foreground text-sm'}>
                  Inactive shifts stay in history but will not be used.
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
                ? props.shift
                  ? 'Saving...'
                  : 'Creating...'
                : props.shift
                  ? 'Save Shift'
                  : 'Create Shift'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toTimeInput(value: string) {
  if (!value) return '';

  if (value.length === 5) {
    return value;
  }

  return value.slice(0, 8);
}

function normalizeTime(value: string) {
  if (!value) return '09:00:00';

  return value.length === 5 ? `${value}:00` : value;
}
