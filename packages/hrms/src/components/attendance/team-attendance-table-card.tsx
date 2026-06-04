'use client';

import { MoreHorizontal } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { cn } from '@kit/ui/utils';

import type { AdminAttendanceRow } from '../../types/attendance.type';

export function TeamAttendanceTableCard(props: {
  isLoading: boolean;
  rows: Array<AdminAttendanceRow>;
  onEditRequested: (row: AdminAttendanceRow) => void;
  onMarkAbsentRequested: (row: AdminAttendanceRow) => void;
  onMarkPresentRequested: (row: AdminAttendanceRow) => void;
  canApprove?: boolean;
  hasFilters?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        'flex min-h-0 flex-col overflow-hidden shadow-sm',
        props.className,
      )}
    >
      <CardHeader
        className={'flex shrink-0 flex-row items-center justify-between p-4'}
      >
        <div>
          <CardTitle className={'text-lg font-semibold'}>
            Team Attendance
          </CardTitle>
          <p className={'text-muted-foreground text-sm'}>
            Review check-ins and update attendance status.
          </p>
        </div>
      </CardHeader>
      <CardContent className={'min-h-0 flex-1 overflow-hidden p-0'}>
        <div
          className={
            'mx-4 mb-4 max-h-[min(520px,calc(100vh-23rem))] min-h-[240px] overflow-auto rounded-lg border'
          }
        >
          <Table>
            <TableHeader>
              <TableRow className={'hover:bg-transparent'}>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className={'w-[48px]'} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className={'text-muted-foreground py-8 text-center text-sm'}
                  >
                    Loading attendance...
                  </TableCell>
                </TableRow>
              ) : null}

              {!props.isLoading && props.rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className={'text-muted-foreground py-8 text-center text-sm'}
                  >
                    {props.hasFilters
                      ? 'No attendance records match the current filters.'
                      : 'No employees found.'}
                  </TableCell>
                </TableRow>
              ) : null}

              {props.rows.map((row) => (
                <TableRow key={row.employee.id}>
                  <TableCell>
                    <div>
                      <p className={'font-semibold'}>{getEmployeeName(row)}</p>
                      <p className={'text-muted-foreground text-xs'}>
                        {row.employee.work_email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className={'text-muted-foreground'}>
                    {row.employee.department?.name ?? 'Unassigned'}
                  </TableCell>
                  <TableCell className={'text-muted-foreground'}>
                    {getShiftName(row)}
                  </TableCell>
                  <TableCell className={'text-muted-foreground'}>
                    {row.record?.check_in
                      ? formatTime(row.record.check_in)
                      : '--'}
                  </TableCell>
                  <TableCell className={'text-muted-foreground'}>
                    {row.record?.check_out
                      ? formatTime(row.record.check_out)
                      : '--'}
                  </TableCell>
                  <TableCell className={'text-muted-foreground'}>
                    {row.record?.work_hours != null
                      ? `${row.record.work_hours}h`
                      : row.displayStatus === 'in_progress'
                        ? 'In Progress'
                        : '--'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.displayStatus} />
                  </TableCell>
                  <TableCell>
                    {props.canApprove ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size={'icon'}
                            variant={'ghost'}
                            aria-label={'Attendance actions'}
                          >
                            <MoreHorizontal className={'h-4 w-4'} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={'end'}>
                          <DropdownMenuItem
                            onClick={() => props.onEditRequested(row)}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => props.onMarkPresentRequested(row)}
                          >
                            Mark Present
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className={'text-destructive'}
                            onClick={() => props.onMarkAbsentRequested(row)}
                          >
                            Mark Absent
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function getEmployeeName(row: AdminAttendanceRow) {
  return `${row.employee.first_name}${row.employee.last_name ? ` ${row.employee.last_name}` : ''}`;
}

function getShiftName(row: AdminAttendanceRow) {
  return row.record?.shift?.name ?? row.employee.shift?.name ?? 'No Shift';
}

function formatTime(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function StatusBadge(props: { status: AdminAttendanceRow['displayStatus'] }) {
  if (props.status === 'absent') {
    return (
      <Badge
        variant={'outline'}
        className={'border-red-500/30 bg-red-500/10 text-red-600'}
      >
        Absent
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
      className={'border-green-500/30 bg-green-500/10 text-green-700'}
    >
      Present
    </Badge>
  );
}
