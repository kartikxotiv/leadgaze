'use client';

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

import type { LeaveReports } from '~/types/leave.type';

import {
  formatMonthLabel,
  formatNumber,
} from '../leave-page.utils';

export function LeaveReportsTab(props: { reports: LeaveReports | null }) {
  return (
    <TabsContent value={'reports'} className={'mt-0'}>
      <div className={'grid gap-6'}>
        <div className={'grid gap-4 md:grid-cols-2 xl:grid-cols-5'}>
          <Card>
            <CardContent className={'p-5'}>
              <p className={'text-muted-foreground text-xs'}>Total Requests</p>
              <p className={'mt-2 text-3xl font-bold'}>
                {props.reports?.summary.total ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className={'p-5'}>
              <p className={'text-muted-foreground text-xs'}>Approved</p>
              <p className={'mt-2 text-3xl font-bold'}>
                {props.reports?.summary.approved ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className={'p-5'}>
              <p className={'text-muted-foreground text-xs'}>Pending</p>
              <p className={'mt-2 text-3xl font-bold'}>
                {props.reports?.summary.pending ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className={'p-5'}>
              <p className={'text-muted-foreground text-xs'}>Rejected</p>
              <p className={'mt-2 text-3xl font-bold'}>
                {props.reports?.summary.rejected ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className={'p-5'}>
              <p className={'text-muted-foreground text-xs'}>Cancelled</p>
              <p className={'mt-2 text-3xl font-bold'}>
                {props.reports?.summary.cancelled ?? 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className={'shadow-sm'}>
          <CardHeader className='p-3'>
            <CardTitle>Leave Balance Report</CardTitle>
            <CardDescription>
              Employee-wise allocated, approved, pending, and available leave.
            </CardDescription>
          </CardHeader>
          <CardContent className={'p-0'}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(props.reports?.balance_report ?? []).map((row) => (
                  <TableRow key={row.employee_id}>
                    <TableCell className={'font-medium'}>
                      {row.employee_name} ({row.employee_code})
                    </TableCell>
                    <TableCell>{row.department_name}</TableCell>
                    <TableCell>{formatNumber(row.allocated)}</TableCell>
                    <TableCell>{formatNumber(row.approved)}</TableCell>
                    <TableCell>{formatNumber(row.pending)}</TableCell>
                    <TableCell>{formatNumber(row.available)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className={'grid gap-6 xl:grid-cols-2'}>
          <Card className={'shadow-sm'}>
            <CardHeader>
              <CardTitle>Utilization By Type</CardTitle>
            </CardHeader>
            <CardContent className={'p-0'}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Rejected</TableHead>
                    <TableHead>Requests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(props.reports?.utilization_by_type ?? []).map((row) => (
                    <TableRow key={row.leave_type_code}>
                      <TableCell className={'font-medium'}>
                        {row.leave_type_name}
                      </TableCell>
                      <TableCell>{formatNumber(row.approved_days)}</TableCell>
                      <TableCell>{formatNumber(row.pending_days)}</TableCell>
                      <TableCell>{formatNumber(row.rejected_days)}</TableCell>
                      <TableCell>{row.total_requests}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className={'shadow-sm'}>
            <CardHeader>
              <CardTitle>Department-wise Leave Report</CardTitle>
            </CardHeader>
            <CardContent className={'p-0'}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Approved Days</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Rejected</TableHead>
                    <TableHead>Total Requests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(props.reports?.department_wise ?? []).map((row) => (
                    <TableRow key={row.department_name}>
                      <TableCell className={'font-medium'}>
                        {row.department_name}
                      </TableCell>
                      <TableCell>{formatNumber(row.approved_days)}</TableCell>
                      <TableCell>{row.pending_requests}</TableCell>
                      <TableCell>{row.rejected_requests}</TableCell>
                      <TableCell>{row.total_requests}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card className={'shadow-sm'}>
          <CardHeader>
            <CardTitle>Leave Trend Analysis</CardTitle>
            <CardDescription>
              Month-wise leave volume across the selected year.
            </CardDescription>
          </CardHeader>
          <CardContent className={'p-0'}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Approved Days</TableHead>
                  <TableHead>Pending Days</TableHead>
                  <TableHead>Rejected Days</TableHead>
                  <TableHead>Total Requests</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(props.reports?.trend_by_month ?? []).map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className={'font-medium'}>
                      {formatMonthLabel(row.month)}
                    </TableCell>
                    <TableCell>{formatNumber(row.approved_days)}</TableCell>
                    <TableCell>{formatNumber(row.pending_days)}</TableCell>
                    <TableCell>{formatNumber(row.rejected_days)}</TableCell>
                    <TableCell>{row.total_requests}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
