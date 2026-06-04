'use client';

import { MoreHorizontal, Plus } from 'lucide-react';

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

import type { Shift } from '~/types/shift.type';

export function ShiftsTableCard(props: {
  shifts: Array<Shift>;
  isLoading: boolean;
  onCreateRequested: () => void;
  onDeleteRequested: (shift: Shift) => void;
  onEditRequested: (shift: Shift) => void;
  canManageShifts?: boolean;
}) {
  return (
    <Card>
      <CardHeader className={'flex flex-row items-center justify-between gap-3 p-4'}>
        <div>
          <CardTitle>Shifts</CardTitle>
          <p className={'text-muted-foreground text-sm'}>
            Create shifts and use them on attendance records.
          </p>
        </div>

        {props.canManageShifts ? (
          <Button variant={'outline'} size={'sm'} onClick={props.onCreateRequested}>
            <Plus className={'mr-2 h-4 w-4'} />
            New Shift
          </Button>
        ) : null}
      </CardHeader>

      <CardContent>
        <div className={'overflow-x-auto rounded-lg border'}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Grace</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className={'w-[48px]'} />
              </TableRow>
            </TableHeader>

            <TableBody>
              {props.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className={'text-muted-foreground py-8 text-center'}>
                    Loading shifts...
                  </TableCell>
                </TableRow>
              ) : null}

              {!props.isLoading && props.shifts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className={'text-muted-foreground py-8 text-center'}>
                    No shifts created yet.
                  </TableCell>
                </TableRow>
              ) : null}

              {props.shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className={'font-medium'}>{shift.name}</TableCell>
                  <TableCell>{formatTime(shift.start_time)}</TableCell>
                  <TableCell>{formatTime(shift.end_time)}</TableCell>
                  <TableCell>{shift.grace_minutes} min</TableCell>
                  <TableCell>
                    <span className={shift.is_active ? 'text-foreground' : 'text-muted-foreground'}>
                      {shift.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {props.canManageShifts ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size={'icon'} variant={'ghost'} aria-label={'Shift actions'}>
                            <MoreHorizontal className={'h-4 w-4'} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={'end'}>
                          <DropdownMenuItem onClick={() => props.onEditRequested(shift)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className={'text-destructive'}
                            onClick={() => props.onDeleteRequested(shift)}
                          >
                            Delete
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

function formatTime(value: string) {
  const time = value.length >= 5 ? value.slice(0, 5) : value;

  return time;
}
