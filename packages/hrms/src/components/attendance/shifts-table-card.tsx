'use client';

import { MoreHorizontal, MoreVertical } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { CustomTableContainer } from '@kit/ui/custom-table-container';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Skeleton } from '@kit/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import type { Shift } from '../../types/shift.type';

export function ShiftsTableCard(props: {
  shifts: Array<Shift>;
  isLoading: boolean;
  onCreateRequested: () => void;
  onDeleteRequested: (shift: Shift) => void;
  onEditRequested: (shift: Shift) => void;
  canManageShifts?: boolean;
}) {
  return (
    <CustomTableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Grace</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="sticky right-0 px-4 text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {props.isLoading
            ? [...Array(6)].map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="h-[32px] px-4 py-2" colSpan={6}>
                    <Skeleton className="h-7 w-full rounded-md" />
                  </TableCell>
                </TableRow>
              ))
            : null}

          {!props.isLoading && props.shifts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                <div className="text-gray-500">No shifts created yet.</div>
              </TableCell>
            </TableRow>
          ) : null}

          {props.shifts.map((shift) => (
            <TableRow key={shift.id} className="hover:bg-muted/50">
              <TableCell className="primary-text-medium">
                {shift.name}
              </TableCell>
              <TableCell>{formatTime(shift.start_time)}</TableCell>
              <TableCell>{formatTime(shift.end_time)}</TableCell>
              <TableCell>{shift.grace_minutes} min</TableCell>
              <TableCell>
                <Badge variant={shift.is_active ? 'default' : 'secondary'}>
                  {shift.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="bg-card sticky right-0 px-4 text-right">
                {props.canManageShifts ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Shift actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => props.onEditRequested(shift)}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
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
    </CustomTableContainer>
  );
}

function formatTime(value: string) {
  return value.length >= 5 ? value.slice(0, 5) : value;
}
