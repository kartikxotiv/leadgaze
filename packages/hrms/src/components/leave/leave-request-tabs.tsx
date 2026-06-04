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
import { cn } from '@kit/ui/utils';

import type {
  LeaveRequest,
  LeaveRequestActionPayload,
} from '~/types/leave.type';

import {
  formatDate,
  formatNumber,
  getLeaveStatusBadgeClass,
} from '../leave-page.utils';

export function LeaveRequestsTab(props: {
  requests: LeaveRequest[];
  selectedYear: number;
  updatePending: boolean;
  onUpdateRequest: (requestId: string, data: LeaveRequestActionPayload) => void;
}) {
  return (
    <TabsContent value={'requests'} className={'mt-0'}>
      <Card className={'shadow-sm'}>
        <CardHeader className='p-3'>
          <CardTitle>My Leave Requests</CardTitle>
          <CardDescription>Track submitted leave and decision history.</CardDescription>
        </CardHeader>
        <CardContent className={'p-0'}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approver</TableHead>
                <TableHead className={'text-right'}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.requests.length > 0 ? (
                props.requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className={'font-medium'}>
                      {request.leave_type?.name ?? 'Unknown'}
                    </TableCell>
                    <TableCell>{formatDate(request.from_date)}</TableCell>
                    <TableCell>{formatDate(request.to_date)}</TableCell>
                    <TableCell>{formatNumber(request.day_count)}</TableCell>
                    <TableCell className={'max-w-[240px] truncate'}>
                      {request.reason ?? 'No reason added'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          'border-0 capitalize',
                          getLeaveStatusBadgeClass(request.status),
                        )}
                      >
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{request.approver_name ?? 'Awaiting decision'}</TableCell>
                    <TableCell className={'text-right'}>
                      {request.can_cancel ? (
                        <Button
                          variant={'outline'}
                          size={'sm'}
                          disabled={props.updatePending}
                          onClick={() =>
                            props.onUpdateRequest(request.id, { action: 'cancel' })
                          }
                        >
                          Cancel
                        </Button>
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
                    No leave requests found for {props.selectedYear}.
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

export function LeaveApprovalsTab(props: {
  requests: LeaveRequest[];
  selectedYear: number;
  updatePending: boolean;
  onUpdateRequest: (requestId: string, data: LeaveRequestActionPayload) => void;
}) {
  return (
    <TabsContent value={'approvals'} className={'mt-0'}>
      <Card className={'shadow-sm'}>
        <CardHeader className='p-3'>
          <CardTitle>Approval Queue</CardTitle>
          <CardDescription>
            Review team or organization leave requests based on your role.
          </CardDescription>
        </CardHeader>
        <CardContent className={'p-0'}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className={'text-right'}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.requests.length > 0 ? (
                props.requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className={'font-medium'}>
                      {request.employee_name}
                    </TableCell>
                    <TableCell>{request.leave_type?.name ?? 'Unknown'}</TableCell>
                    <TableCell>{formatDate(request.from_date)}</TableCell>
                    <TableCell>{formatDate(request.to_date)}</TableCell>
                    <TableCell>{formatNumber(request.day_count)}</TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          'border-0 capitalize',
                          getLeaveStatusBadgeClass(request.status),
                        )}
                      >
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={'max-w-[240px] truncate'}>
                      {request.reason ?? 'No reason added'}
                    </TableCell>
                    <TableCell className={'text-right'}>
                      {request.can_approve ? (
                        <div className={'flex justify-end gap-2'}>
                          <Button
                            size={'sm'}
                            disabled={props.updatePending}
                            onClick={() =>
                              props.onUpdateRequest(request.id, { action: 'approve' })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            variant={'outline'}
                            size={'sm'}
                            disabled={props.updatePending}
                            onClick={() =>
                              props.onUpdateRequest(request.id, { action: 'reject' })
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className={'text-muted-foreground text-xs'}>
                          {request.leave_type?.requires_hr_approval
                            ? 'Needs HR approval'
                            : 'Read only'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className={'text-muted-foreground py-8 text-center'}
                  >
                    No approval items found for {props.selectedYear}.
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
