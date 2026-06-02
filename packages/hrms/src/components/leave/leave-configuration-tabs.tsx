'use client';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { TabsContent } from '@kit/ui/tabs';

import type { LeaveHoliday, LeaveType } from '~/types/leave.type';

import { formatDate, formatNumber } from '../leave-page.utils';

export function LeaveHolidaysTab(props: {
  holidays: LeaveHoliday[];
  canManageHolidays: boolean;
  deletePending: boolean;
  onDeleteHoliday: (holidayId: string) => void;
  onEditHoliday: (holiday: LeaveHoliday) => void;
}) {
  return (
    <TabsContent value={'holidays'} className={'mt-0'}>
      <Card className={'shadow-sm'}>
        <CardHeader className="p-3">
          <CardTitle>Holiday Calendar</CardTitle>
          <CardDescription>
            Organization holidays are excluded from leave day calculations.
          </CardDescription>
        </CardHeader>
        <CardContent className={'p-0'}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className={'text-right'}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.holidays.length > 0 ? (
                props.holidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell>{formatDate(holiday.holiday_date)}</TableCell>
                    <TableCell className={'font-medium'}>
                      {holiday.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={'outline'}>
                        {holiday.is_optional ? 'Optional' : 'Mandatory'}
                      </Badge>
                    </TableCell>
                    <TableCell className={'max-w-[320px] truncate'}>
                      {holiday.description ?? 'No description'}
                    </TableCell>
                    <TableCell className={'text-right'}>
                      {props.canManageHolidays ? (
                        <div className={'flex justify-end gap-2'}>
                          <Button
                            variant={'outline'}
                            size={'sm'}
                            onClick={() => props.onEditHoliday(holiday)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant={'outline'}
                            size={'sm'}
                            disabled={props.deletePending}
                            onClick={() => props.onDeleteHoliday(holiday.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className={'text-muted-foreground py-8 text-center'}
                  >
                    No holidays configured yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

export function LeaveTypesTab(props: {
  canManageLeaveTypes: boolean;
  deletePending: boolean;
  leaveTypes: LeaveType[];
  onDeleteLeaveType: (typeId: string) => void;
  onEditLeaveType: (leaveType: LeaveType) => void;
}) {
  return (
    <TabsContent value={'types'} className={'mt-0'}>
      <Card className={'shadow-sm'}>
        <CardHeader className="p-3">
          <CardTitle>Leave Types</CardTitle>
          <CardDescription>
            Configure leave categories, allocations, and approval rules.
          </CardDescription>
        </CardHeader>
        <CardContent className={'p-0'}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Allocation</TableHead>
                <TableHead>Carry Forward</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className={'text-right'}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.leaveTypes.length > 0 ? (
                props.leaveTypes.map((leaveType) => (
                  <TableRow key={leaveType.id}>
                    <TableCell className={'font-medium'}>
                      {leaveType.code}
                    </TableCell>
                    <TableCell>{leaveType.name}</TableCell>
                    <TableCell>
                      {formatNumber(leaveType.annual_allocation)}
                    </TableCell>
                    <TableCell>
                      {leaveType.can_carry_forward ? 'Enabled' : 'Disabled'}
                    </TableCell>
                    <TableCell>
                      {leaveType.requires_hr_approval ? 'HR' : 'Manager'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={'outline'}>
                        {leaveType.is_active ? 'Active' : 'Archived'}
                      </Badge>
                    </TableCell>
                    <TableCell className={'max-w-[320px] truncate'}>
                      {leaveType.description ?? 'No description'}
                    </TableCell>
                    <TableCell className={'text-right'}>
                      {props.canManageLeaveTypes ? (
                        <div className={'flex justify-end gap-2'}>
                          <Button
                            variant={'outline'}
                            size={'sm'}
                            onClick={() => props.onEditLeaveType(leaveType)}
                          >
                            Edit
                          </Button>
                          {leaveType.is_active ? (
                            <Button
                              variant={'outline'}
                              size={'sm'}
                              disabled={props.deletePending}
                              onClick={() =>
                                props.onDeleteLeaveType(leaveType.id)
                              }
                            >
                              Archive
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className={'text-muted-foreground py-8 text-center'}
                  >
                    No leave types configured yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
