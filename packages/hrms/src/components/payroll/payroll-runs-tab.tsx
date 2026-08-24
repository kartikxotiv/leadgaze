'use client';

import { useState } from 'react';

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

import type { PayrollDashboardResponse } from '../../types/payroll.type';
import { PayrollStatusBadge } from '../page.components';
import { formatCurrency } from '../utils';

export function PayrollRunsTab(props: {
  payrollRuns: PayrollDashboardResponse['payrollRuns'];
  onApproveRun: (runId: string) => void;
  canApprove?: boolean;
}) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const selectedRun =
    props.payrollRuns.find((run) => run.id === selectedRunId) ??
    props.payrollRuns[0] ??
    null;

  return (
    <TabsContent value="runs" className="mt-0">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <PayrollTableHeader
            title="Payroll Runs"
            description="A payroll run processes one period and creates employee-level entries before payslips are published."
          />
          <CustomTableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>Entries</TableHead>
                  <TableHead>Payout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="sticky right-0 px-4 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.payrollRuns.length > 0 ? (
                  props.payrollRuns.map((item) => (
                    <TableRow
                      key={item.id}
                      className={
                        selectedRun?.id === item.id
                          ? 'bg-muted/40 hover:bg-muted/50'
                          : 'hover:bg-muted/50 cursor-pointer'
                      }
                      onClick={() => setSelectedRunId(item.id)}
                    >
                      <TableCell className="font-medium">
                        {item.period}
                      </TableCell>
                      <TableCell>{item.dates}</TableCell>
                      <TableCell>{item.assignments}</TableCell>
                      <TableCell>{item.entries}</TableCell>
                      <TableCell>{formatCurrency(item.payout)}</TableCell>
                      <TableCell>
                        <PayrollStatusBadge label={item.status} />
                      </TableCell>
                      <TableCell className="bg-card sticky right-0 px-4 text-right">
                        {props.canApprove && item.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              props.onApproveRun(item.id);
                            }}
                          >
                            Approve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center">
                      <p className="text-muted-foreground">
                        No payroll runs found yet.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CustomTableContainer>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <CardWidgetContainer
            title="Selected Run Summary"
            desc="Click a payroll run above to review its totals and employee-level calculations."
            contentClassName="space-y-4 p-4"
          >
            {selectedRun ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Period</p>
                    <p className="mt-1 font-medium">{selectedRun.dates}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Status</p>
                    <div className="mt-2">
                      <PayrollStatusBadge label={selectedRun.status} />
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">
                      Eligible Assignments
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {selectedRun.assignments}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">
                      Generated Entries
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {selectedRun.entries}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">
                      Gross Earnings
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {formatCurrency(selectedRun.grossEarnings)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-muted-foreground text-sm">Net Payout</p>
                    <p className="text-primary mt-1 text-2xl font-semibold">
                      {formatCurrency(selectedRun.payout)}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">How to read this</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Assignments shows how many active primary compensation
                    assignments matched the run period. Entries shows how many
                    payroll calculation rows were created. Net payout is the sum
                    of all entry net pay values for this run.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                No payroll run selected.
              </p>
            )}
          </CardWidgetContainer>

          <div className="grid gap-2">
            <PayrollTableHeader
              title="Employee Breakdown"
              description="Detailed employee calculations for the selected payroll run."
            />
            <CustomTableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRun && selectedRun.breakdown.length > 0 ? (
                    selectedRun.breakdown.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {item.employee}
                        </TableCell>
                        <TableCell>{formatCurrency(item.earnings)}</TableCell>
                        <TableCell>{formatCurrency(item.deductions)}</TableCell>
                        <TableCell>{formatCurrency(item.net)}</TableCell>
                        <TableCell>
                          <PayrollStatusBadge label={item.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-muted-foreground py-6 text-center"
                      >
                        No payroll entries found for this run yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CustomTableContainer>
          </div>
        </div>

        {selectedRun && selectedRun.breakdown.length > 0 && (
          <CardWidgetContainer
            title="Line Item Breakdown"
            desc="Recurring assignment items and one-time pay items that make up the selected run."
            contentClassName="space-y-4 p-4"
          >
            {selectedRun.breakdown.map((entry) => (
              <div key={entry.id} className="rounded-lg border">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                  <div>
                    <p className="font-medium">{entry.employee}</p>
                    <p className="text-muted-foreground text-sm">
                      Earnings {formatCurrency(entry.earnings)} - Deductions{' '}
                      {formatCurrency(entry.deductions)} - Net{' '}
                      {formatCurrency(entry.net)}
                    </p>
                  </div>
                  <PayrollStatusBadge label={entry.status} />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entry.items.length > 0 ? (
                      entry.items.map((line) => (
                        <TableRow key={line.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            {line.component}
                          </TableCell>
                          <TableCell className="capitalize">
                            {line.source.replace('_', ' ')}
                          </TableCell>
                          <TableCell className="capitalize">
                            {line.type.replace('_', ' ')}
                          </TableCell>
                          <TableCell className="text-right">
                            {line.type === 'deduction' ? '-' : ''}
                            {formatCurrency(line.amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-muted-foreground py-4 text-center"
                        >
                          No line items were generated for this employee.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            ))}
          </CardWidgetContainer>
        )}
      </div>
    </TabsContent>
  );
}

function PayrollTableHeader(props: { description: string; title: string }) {
  return (
    <div className="px-1">
      <h2 className="primary-heading leading-tight text-leadgaze-dark dark:text-white">{props.title}</h2>
      <p className="primary-text-regular text-muted-foreground mt-1">{props.description}</p>
    </div>
  );
}
