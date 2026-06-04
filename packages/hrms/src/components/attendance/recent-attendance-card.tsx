'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';

import type { AttendanceRecord } from '~/types/attendance.type';

import { formatHeaderDate, formatTime } from '../attendance-page.utils';

export function RecentAttendanceCard(props: {
  records: Array<AttendanceRecord>;
}) {
  return (
    <Card className={'shadow-sm'}>
      <CardHeader className='p-2'>
        <CardTitle className={'text-lg font-semibold'}>Recent Days</CardTitle>
        <p className={'text-muted-foreground text-sm'}>
          Last 14 processed attendance records.
        </p>
      </CardHeader>

      <CardContent className={'space-y-3'}>
        {props.records.length === 0 ? (
          <p className={'text-muted-foreground text-sm'}>
            No processed records yet.
          </p>
        ) : (
          props.records.map((record) => (
            <div
              key={record.id}
              className={'flex items-center justify-between rounded-lg border px-4 py-3'}
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
      </CardContent>
    </Card>
  );
}
