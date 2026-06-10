'use client';

import type { ReactNode } from 'react';

import {
  Ban,
  CheckCircle2,
  ClipboardList,
  Clock3,
  type LucideIcon,
  XCircle,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { CustomTableContainer } from '@kit/ui/custom-table-container';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { TabsContent } from '@kit/ui/tabs';

import type { LeaveReports } from '../../types/leave.type';
import { formatMonthLabel, formatNumber } from '../leave-page.utils';

export function LeaveReportsTab(props: { reports: LeaveReports | null }) {
  return (
    <TabsContent value="reports" className="mt-0">
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <ReportMetric
            label="Total Requests"
            value={props.reports?.summary.total ?? 0}
            description="All requests in the selected period"
            icon={ClipboardList}
            iconClassName="bg-primary"
          />
          <ReportMetric
            label="Approved"
            value={props.reports?.summary.approved ?? 0}
            description="Requests approved by reviewers"
            icon={CheckCircle2}
            iconClassName="bg-activity-5"
          />
          <ReportMetric
            label="Pending"
            value={props.reports?.summary.pending ?? 0}
            description="Requests still awaiting action"
            icon={Clock3}
            iconClassName="bg-activity-4"
          />
          <ReportMetric
            label="Rejected"
            value={props.reports?.summary.rejected ?? 0}
            description="Requests declined by approvers"
            icon={XCircle}
            iconClassName="bg-destructive"
          />
          <ReportMetric
            label="Cancelled"
            value={props.reports?.summary.cancelled ?? 0}
            description="Requests cancelled by employees"
            icon={Ban}
            iconClassName="bg-activity-3"
          />
        </div>

        <ReportSection
          title="Leave Balance Report"
          description="Employee-wise allocated, approved, pending, and available leave."
        >
          <CustomTableContainer>
            <Table>
              <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
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
                {(props.reports?.balance_report ?? []).length > 0 ? (
                  (props.reports?.balance_report ?? []).map((row) => (
                    <TableRow
                      key={row.employee_id}
                      className="hover:bg-muted/50"
                    >
                      <TableCell className="primary-text-medium">
                        {row.employee_name} ({row.employee_code})
                      </TableCell>
                      <TableCell>{row.department_name}</TableCell>
                      <TableCell>{formatNumber(row.allocated)}</TableCell>
                      <TableCell>{formatNumber(row.approved)}</TableCell>
                      <TableCell>{formatNumber(row.pending)}</TableCell>
                      <TableCell>{formatNumber(row.available)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="text-gray-500">
                        No leave balance records found.
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CustomTableContainer>
        </ReportSection>

        <div className="grid gap-6 xl:grid-cols-2">
          <ReportSection title="Utilization By Type">
            <CustomTableContainer>
              <Table>
                <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Rejected</TableHead>
                    <TableHead>Requests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(props.reports?.utilization_by_type ?? []).length > 0 ? (
                    (props.reports?.utilization_by_type ?? []).map((row) => (
                      <TableRow
                        key={row.leave_type_code}
                        className="hover:bg-muted/50"
                      >
                        <TableCell className="primary-text-medium">
                          {row.leave_type_name}
                        </TableCell>
                        <TableCell>{formatNumber(row.approved_days)}</TableCell>
                        <TableCell>{formatNumber(row.pending_days)}</TableCell>
                        <TableCell>{formatNumber(row.rejected_days)}</TableCell>
                        <TableCell>{row.total_requests}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <div className="text-gray-500">
                          No utilization records found.
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CustomTableContainer>
          </ReportSection>

          <ReportSection title="Department-wise Leave Report">
            <CustomTableContainer>
              <Table>
                <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Approved Days</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Rejected</TableHead>
                    <TableHead>Total Requests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(props.reports?.department_wise ?? []).length > 0 ? (
                    (props.reports?.department_wise ?? []).map((row) => (
                      <TableRow
                        key={row.department_name}
                        className="hover:bg-muted/50"
                      >
                        <TableCell className="primary-text-medium">
                          {row.department_name}
                        </TableCell>
                        <TableCell>{formatNumber(row.approved_days)}</TableCell>
                        <TableCell>{row.pending_requests}</TableCell>
                        <TableCell>{row.rejected_requests}</TableCell>
                        <TableCell>{row.total_requests}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <div className="text-gray-500">
                          No department records found.
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CustomTableContainer>
          </ReportSection>
        </div>

        <ReportSection
          title="Leave Trend Analysis"
          description="Month-wise leave volume across the selected year."
        >
          <CustomTableContainer>
            <Table>
              <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Approved Days</TableHead>
                  <TableHead>Pending Days</TableHead>
                  <TableHead>Rejected Days</TableHead>
                  <TableHead>Total Requests</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(props.reports?.trend_by_month ?? []).length > 0 ? (
                  (props.reports?.trend_by_month ?? []).map((row) => (
                    <TableRow key={row.month} className="hover:bg-muted/50">
                      <TableCell className="primary-text-medium">
                        {formatMonthLabel(row.month)}
                      </TableCell>
                      <TableCell>{formatNumber(row.approved_days)}</TableCell>
                      <TableCell>{formatNumber(row.pending_days)}</TableCell>
                      <TableCell>{formatNumber(row.rejected_days)}</TableCell>
                      <TableCell>{row.total_requests}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="text-gray-500">
                        No trend records found.
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CustomTableContainer>
        </ReportSection>
      </div>
    </TabsContent>
  );
}

function ReportMetric(props: {
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: number;
}) {
  const Icon = props.icon;

  return (
    <Card className="flex h-32 flex-col justify-between xl:h-28 2xl:h-32">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
        <div className="space-y-1">
          <CardTitle className="secondary-text-small text-leadgaze-muted dark:text-white">
            {props.label}
          </CardTitle>
          <div className="primary-heading-number text-leadgaze-dark dark:text-zinc-100">
            {props.value}
          </div>
        </div>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded ${props.iconClassName}`}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2">
        <CardDescription className="secondary-text-small text-leadgaze-success">
          {props.description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

function ReportSection(props: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="grid gap-3">
      <div className="px-1">
        <h2 className="text-base font-semibold leading-tight">{props.title}</h2>
        {props.description ? (
          <p className="text-muted-foreground mt-1 text-sm">
            {props.description}
          </p>
        ) : null}
      </div>
      {props.children}
    </div>
  );
}
