'use client';

import { Download } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
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

import type {
  SelfServicePayslipSummary,
  SelfServiceRequest,
} from '../../types/self-service.type';
import {
  formatCurrency,
  formatDate,
  formatPayslipPeriod,
  getRequestCategoryLabel,
  getRequestStatusLabel,
} from './page.data';
import { getStatusBadgeClassName } from './page.shared';
import { useColumnResize } from '@kit/ui/use-column-resize';
import { useTableSort } from '@kit/ui/use-table-sort';
import { SortableTableHead } from '@kit/ui/sortable-table-head';

export function SelfServicePayslipsTab(props: {
  canDownload: boolean;
  onDownload: (payslipId: string) => void;
  onView: (payslip: SelfServicePayslipSummary) => void;
  payslips: Array<SelfServicePayslipSummary>;
}) {
  const { getHeaderProps, getResizeHandleProps } = useColumnResize('hrms-self-service-payslips');

  const { sortColumn, sortDirection, toggleSort, sortedData } = useTableSort<SelfServicePayslipSummary>(
    'hrms-self-service-payslips',
    props.payslips
  );

  return (
    <TabsContent value="payslips" className="mt-0">
      <div className="grid gap-2">
        <SelfServiceTabHeader
          title="Payslips"
          description="Review payroll snapshots and download them when access is granted."
        />

        <CustomTableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  label="Period"
                  columnId="period"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                  className="relative"
                  {...getHeaderProps('period')}
                >
                  <span className="col-resize-handle" {...getResizeHandleProps('period')} />
                </SortableTableHead>
                <SortableTableHead
                  label="Gross"
                  columnId="gross"
                  sortKey="gross_salary"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                  className="relative"
                  {...getHeaderProps('gross')}
                >
                  <span className="col-resize-handle" {...getResizeHandleProps('gross')} />
                </SortableTableHead>
                <SortableTableHead
                  label="Deductions"
                  columnId="deductions"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                  className="relative"
                  {...getHeaderProps('deductions')}
                >
                  <span className="col-resize-handle" {...getResizeHandleProps('deductions')} />
                </SortableTableHead>
                <SortableTableHead
                  label="Net Pay"
                  columnId="net_pay"
                  sortKey="net_salary"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                  className="relative"
                  {...getHeaderProps('net_pay')}
                >
                  <span className="col-resize-handle" {...getResizeHandleProps('net_pay')} />
                </SortableTableHead>
                <SortableTableHead
                  label="Status"
                  columnId="status"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                  className="relative"
                  {...getHeaderProps('status')}
                >
                  <span className="col-resize-handle" {...getResizeHandleProps('status')} />
                </SortableTableHead>
                <TableHead className="sticky right-0 px-4 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((payslip) => (
                <TableRow key={payslip.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {formatPayslipPeriod(payslip)}
                  </TableCell>
                  <TableCell>{formatCurrency(payslip.gross_salary)}</TableCell>
                  <TableCell>{formatCurrency(payslip.deductions)}</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(payslip.net_salary)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusBadgeClassName(payslip.status)}
                    >
                      {payslip.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="bg-card sticky right-0 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => props.onView(payslip)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!props.canDownload}
                        onClick={() => props.onDownload(payslip.id)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {props.payslips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center">
                    No payslips are available yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CustomTableContainer>
      </div>
    </TabsContent>
  );
}

export function SelfServiceRequestsTab(props: {
  requests: Array<SelfServiceRequest>;
}) {
  return (
    <TabsContent value="requests" className="mt-0">
      <CardWidgetContainer
        title="HR Requests"
        desc="Track tickets raised with HR, payroll, or operations."
        contentClassName="space-y-2 p-4"
      >
        {props.requests.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            No requests raised yet.
          </div>
        ) : (
          props.requests.map((request) => (
            <div key={request.id} className="rounded-lg border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {getRequestCategoryLabel(request.category)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={getStatusBadgeClassName(request.status)}
                    >
                      {getRequestStatusLabel(request.status)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={getStatusBadgeClassName(request.priority)}
                    >
                      {request.priority}
                    </Badge>
                  </div>
                  <p className="font-semibold">{request.subject}</p>
                  <p className="text-muted-foreground text-sm leading-6">
                    {request.description}
                  </p>
                </div>
                <div className="text-muted-foreground text-xs sm:text-right">
                  <p>Raised {formatDate(request.created_at)}</p>
                  {request.resolved_at ? (
                    <p className="mt-1">
                      Resolved {formatDate(request.resolved_at)}
                    </p>
                  ) : null}
                </div>
              </div>

              {request.response_message ? (
                <div className="bg-muted/40 mt-4 rounded-lg border p-3 text-sm">
                  <span className="font-medium">HR update:</span>{' '}
                  {request.response_message}
                </div>
              ) : null}
            </div>
          ))
        )}
      </CardWidgetContainer>
    </TabsContent>
  );
}

function SelfServiceTabHeader(props: { description: string; title: string }) {
  return (
    <div className="px-1">
      <h2 className="primary-heading leading-tight text-leadgaze-dark dark:text-white">{props.title}</h2>
      <p className="primary-text-regular text-muted-foreground mt-1">{props.description}</p>
    </div>
  );
}
