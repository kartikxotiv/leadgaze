'use client';

import { CardWidgetContainer } from '@kit/ui/card-widget-container';

import { formatHeaderDate, formatTime } from '../../attendance-page.utils';
import type { AttendanceRecord } from '../../types/attendance.type';

export function RecentAttendanceCard(props: {
  records: Array<AttendanceRecord>;
}) {
  return (
    <CardWidgetContainer
      title="Recent Days"
      desc="Last 14 processed attendance records."
      contentClassName="space-y-3 p-4"
    >
      {props.records.length === 0 ? (
        <p className={'text-muted-foreground text-sm'}>
          No processed records yet.
        </p>
      ) : (
        props.records.map((record) => (
          <div
            key={record.id}
            className={
              'flex items-center justify-between rounded-lg border px-4 py-3'
            }
          >
            <div>
              <p className={'text-sm font-medium'}>
                {formatHeaderDate(record.date)}
              </p>
              <p className={'text-muted-foreground text-xs'}>
                {record.check_in ? formatTime(record.check_in) : '--'} to{' '}
                {record.check_out ? formatTime(record.check_out) : '--'}
              </p>
            </div>
            <div className={'text-right'}>
              <p className={'text-sm font-semibold'}>
                {record.work_hours
                  ? `${record.work_hours}h`
                  : record.check_in && !record.check_out
                    ? 'In Progress'
                    : '--'}
              </p>
              <p className={'text-muted-foreground text-xs'}>
                {record.status === 'present' ? 'Present' : 'Absent'}
              </p>
            </div>
          </div>
        ))
      )}
    </CardWidgetContainer>
  );
}
