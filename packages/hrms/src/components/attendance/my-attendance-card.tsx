'use client';

import { type ComponentType, useMemo } from 'react';

import { CheckCircle2, Clock, LogIn, LogOut, Timer } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';

import type {
  AttendanceLog,
  AttendanceRecord,
  Shift,
} from '~/types/attendance.type';

type AttendanceCardStatus =
  | 'not_checked_in'
  | 'in_progress'
  | 'completed'
  | 'short_hours';

export function MyAttendanceCard(props: {
  date: string;
  logs: Array<AttendanceLog>;
  onCheckIn: () => void;
  onCheckOut: () => void;
  record: (AttendanceRecord & { shift: Shift | null }) | null;
  isCheckingIn: boolean;
  isCheckingOut: boolean;
  isWorkingDay?: boolean;
}) {
  const shiftRequirement = useMemo(
    () => getShiftRequirement(props.record?.shift ?? null),
    [props.record?.shift],
  );

  const workedMinutes = useMemo(
    () =>
      getWorkedMinutes(
        props.record?.check_in ?? null,
        props.record?.check_out ?? null,
      ),
    [props.record?.check_in, props.record?.check_out],
  );

  const status = useMemo(() => {
    if (!props.record?.check_in) {
      return 'not_checked_in';
    }

    if (props.record.check_in && !props.record.check_out) {
      return 'in_progress';
    }

    if (!shiftRequirement) {
      return 'completed';
    }

    if (workedMinutes === null) {
      return 'short_hours';
    }

    return workedMinutes >= shiftRequirement.requiredMinutes
      ? 'completed'
      : 'short_hours';
  }, [
    props.record?.check_in,
    props.record?.check_out,
    shiftRequirement,
    workedMinutes,
  ]);

  const workHoursLabel = useMemo(() => {
    if (props.record?.work_hours != null) {
      return `${props.record.work_hours}h`;
    }

    if (workedMinutes != null) {
      return `${Math.round((workedMinutes / 60) * 100) / 100}h`;
    }

    return status === 'in_progress' ? 'In Progress' : '--';
  }, [props.record?.work_hours, status, workedMinutes]);

  return (
    <Card className={'shadow-sm'}>
      <CardHeader className={'flex flex-row items-center justify-between p-2'}>
        <div>
          <CardTitle className={'text-lg font-semibold'}>My Day</CardTitle>
          <p className={'text-muted-foreground text-sm'}>
            {formatDate(props.date)}{' '}
            {props.record?.shift ? ` - ${props.record.shift.name}` : ''}
          </p>
        </div>
        <StatusPill status={status} />
      </CardHeader>
      <CardContent className={'space-y-4 p-2'}>
        <div className={'grid gap-3 sm:grid-cols-3'}>
          <Metric
            icon={LogIn}
            label={'Check In'}
            value={
              props.record?.check_in ? formatTime(props.record.check_in) : '--'
            }
          />
          <Metric
            icon={LogOut}
            label={'Check Out'}
            value={
              props.record?.check_out
                ? formatTime(props.record.check_out)
                : '--'
            }
          />
          <Metric icon={Timer} label={'Work Hours'} value={workHoursLabel} />
        </div>

        <div className={'flex flex-col gap-3 sm:flex-row'}>
          <Button
            className={'flex-1'}
            disabled={
              !props.isWorkingDay ||
              status !== 'not_checked_in' ||
              props.isCheckingIn ||
              props.isCheckingOut
            }
            onClick={props.onCheckIn}
          >
            <Clock className={'mr-2 h-4 w-4'} />
            {props.isCheckingIn ? 'Checking in...' : 'Check In'}
          </Button>
          <Button
            className={'flex-1'}
            variant={'outline'}
            disabled={
              status !== 'in_progress' ||
              props.isCheckingIn ||
              props.isCheckingOut
            }
            onClick={props.onCheckOut}
          >
            <CheckCircle2 className={'mr-2 h-4 w-4'} />
            {props.isCheckingOut ? 'Checking out...' : 'Check Out'}
          </Button>
        </div>

        <div className={'rounded-lg border p-4'}>
          <p className={'text-sm font-medium'}>Today&apos;s Punches</p>
          <div className={'mt-3 space-y-2'}>
            {props.logs.length === 0 ? (
              <p className={'text-muted-foreground text-sm'}>No punches yet.</p>
            ) : (
              props.logs.map((log) => (
                <div
                  key={log.id}
                  className={'flex items-center justify-between text-sm'}
                >
                  <span className={'text-muted-foreground'}>
                    {log.punch_type === 'in' ? 'Check In' : 'Check Out'}
                  </span>
                  <span className={'font-medium'}>
                    {formatTime(log.punch_time)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric(props: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  const Icon = props.icon;

  return (
    <div className={'rounded-lg border p-4'}>
      <div className={'flex items-center gap-2'}>
        <Icon className={'text-muted-foreground h-4 w-4'} />
        <p className={'text-muted-foreground text-xs font-medium'}>
          {props.label}
        </p>
      </div>
      <p className={'mt-2 text-lg font-semibold'}>{props.value}</p>
    </div>
  );
}

function StatusPill(props: { status: AttendanceCardStatus }) {
  if (props.status === 'completed') {
    return (
      <Badge
        variant={'outline'}
        className={'border-green-500/30 bg-green-500/10 text-green-700'}
      >
        Completed
      </Badge>
    );
  }

  if (props.status === 'short_hours') {
    return (
      <Badge
        variant={'outline'}
        className={'border-amber-500/30 bg-amber-500/10 text-amber-700'}
      >
        Short Hours
      </Badge>
    );
  }

  if (props.status === 'in_progress') {
    return (
      <Badge
        variant={'outline'}
        className={'border-sky-500/30 bg-sky-500/10 text-sky-700'}
      >
        In Progress
      </Badge>
    );
  }

  return (
    <Badge
      variant={'outline'}
      className={'border-muted-foreground/20 bg-muted text-muted-foreground'}
    >
      Not Checked In
    </Badge>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'full',
  }).format(new Date(value));
}

function getWorkedMinutes(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) {
    return null;
  }

  const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();

  if (diffMs <= 0) {
    return null;
  }

  return diffMs / (1000 * 60);
}

function getShiftRequirement(shift: Shift | null) {
  if (!shift) {
    return null;
  }

  const startMinutes = parseTimeToMinutes(shift.start_time);
  const endMinutes = parseTimeToMinutes(shift.end_time);

  if (startMinutes === null || endMinutes === null) {
    return null;
  }

  let scheduledMinutes = endMinutes - startMinutes;

  if (scheduledMinutes <= 0) {
    scheduledMinutes += 24 * 60;
  }

  return {
    scheduledMinutes,
    requiredMinutes: Math.max(
      scheduledMinutes - Math.max(shift.grace_minutes ?? 0, 0),
      0,
    ),
  };
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes = '0', seconds = '0'] = value.split(':');
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes);
  const parsedSeconds = Number(seconds);

  if (
    Number.isNaN(parsedHours) ||
    Number.isNaN(parsedMinutes) ||
    Number.isNaN(parsedSeconds)
  ) {
    return null;
  }

  return parsedHours * 60 + parsedMinutes + parsedSeconds / 60;
}
