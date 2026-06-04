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

import type { AdminAttendanceRow } from '../../types/attendance.type';

type ShiftOption = {
  id: string;
  name: string;
};

type RecordDialogState = {
  check_in: string;
  check_out: string;
  shift_id: string | null;
  status: 'present' | 'absent';
};

export function AttendanceRecordDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    check_in?: string | null;
    check_out?: string | null;
    shift_id?: string | null;
    status?: 'present' | 'absent';
  }) => void;
  isPending: boolean;
  row: AdminAttendanceRow | null;
  shifts: Array<ShiftOption>;
  date: string;
}) {
  const [form, setForm] = useState<RecordDialogState>({
    check_in: '',
    check_out: '',
    shift_id: null,
    status: 'present',
  });

  useEffect(() => {
    if (!props.open) return;

    if (!props.row?.record) {
      setForm({
        check_in: '',
        check_out: '',
        shift_id: props.row?.employee.shift_id ?? null,
        status: 'absent',
      });
      return;
    }

    setForm({
      check_in: props.row.record.check_in
        ? toLocalDateTimeInput(props.row.record.check_in)
        : '',
      check_out: props.row.record.check_out
        ? toLocalDateTimeInput(props.row.record.check_out)
        : '',
      shift_id: props.row.record.shift_id ?? props.row.employee.shift_id,
      status: props.row.record.status,
    });
  }, [props.open, props.row]);

  const shiftOptions = useMemo(() => {
    return props.shifts.filter((shift) => Boolean(shift.id));
  }, [props.shifts]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    props.onSubmit({
      check_in: form.check_in ? toISOStringFromLocal(form.check_in) : null,
      check_out: form.check_out ? toISOStringFromLocal(form.check_out) : null,
      shift_id: form.shift_id,
      status: form.status,
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className={'sm:max-w-[600px]'}>
        <form className={'space-y-5'} onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle className={'text-2xl'}>Edit Attendance</DialogTitle>
            <DialogDescription className={'text-base'}>
              {props.row
                ? `Update attendance for ${getEmployeeName(props.row)} on ${props.date}.`
                : 'Update attendance record.'}
            </DialogDescription>
          </DialogHeader>

          <div className={'grid gap-4 sm:grid-cols-2'}>
            <div className={'space-y-2'}>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    status: value as 'present' | 'absent',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={'Select status'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={'present'}>Present</SelectItem>
                  <SelectItem value={'absent'}>Absent</SelectItem>
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
                  {shiftOptions.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {shift.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={'space-y-2'}>
              <Label htmlFor={'check-in'}>Check In</Label>
              <Input
                id={'check-in'}
                type={'datetime-local'}
                step={1}
                value={form.check_in}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, check_in: event.target.value }))
                }
              />
            </div>

            <div className={'space-y-2'}>
              <Label htmlFor={'check-out'}>Check Out</Label>
              <Input
                id={'check-out'}
                type={'datetime-local'}
                step={1}
                value={form.check_out}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    check_out: event.target.value,
                  }))
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
              {props.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getEmployeeName(row: AdminAttendanceRow) {
  return `${row.employee.first_name}${row.employee.last_name ? ` ${row.employee.last_name}` : ''}`;
}

function toLocalDateTimeInput(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  const seconds = `${date.getSeconds()}`.padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function toISOStringFromLocal(value: string) {
  return new Date(value).toISOString();
}
