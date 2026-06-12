'use client';

import { Button } from '@kit/ui/button';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { Checkbox } from '@kit/ui/checkbox';

import type { WorkingDay } from '../../types/attendance.type';

const weekdays: Array<{ label: string; value: WorkingDay }> = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export function WorkingDaysCard(props: {
  canManageShifts?: boolean;
  isLoading: boolean;
  isPending: boolean;
  onChange: (workingDays: Array<WorkingDay>) => void;
  onReset: () => void;
  workingDays: Array<WorkingDay>;
}) {
  const selectedDays = new Set(props.workingDays);

  const toggleDay = (day: WorkingDay) => {
    const nextDays = selectedDays.has(day)
      ? props.workingDays.filter((value) => value !== day)
      : [...props.workingDays, day];

    if (nextDays.length === 0) {
      return;
    }

    props.onChange(nextDays.sort((a, b) => a - b));
  };

  return (
    <CardWidgetContainer
      title="Working Days"
      desc="Set the regular office days used by attendance."
      contentClassName="p-4"
      icon2={
        props.canManageShifts ? (
          <Button
            variant={'outline'}
            size={'sm'}
            onClick={props.onReset}
            disabled={props.isLoading || props.isPending}
          >
            Mon-Fri
          </Button>
        ) : null
      }
    >
      <div className={'grid gap-3 sm:grid-cols-7'}>
        {weekdays.map((day) => (
          <label
            key={day.value}
            className={
              'bg-background flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium'
            }
          >
            <Checkbox
              checked={selectedDays.has(day.value)}
              disabled={
                !props.canManageShifts || props.isLoading || props.isPending
              }
              onCheckedChange={() => toggleDay(day.value)}
            />
            {day.label}
          </label>
        ))}
      </div>
    </CardWidgetContainer>
  );
}
