/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useQuery } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import { listPayslipComponentsService } from '../../server/services/payroll.service';

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

export function PayslipDetailsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payslip: any | null;
}) {
  const componentsQuery = useQuery({
    queryKey: ['payslip-components', props.payslip?.id],
    queryFn: () => listPayslipComponentsService(props.payslip!.id),
    enabled: !!props.payslip?.id && props.open,
  });

  const components = (componentsQuery.data?.data as any[]) || [];

  const earnings = components.filter(
    (c) => c.salary_component?.type === 'earning',
  );
  const deductions = components.filter(
    (c) => c.salary_component?.type === 'deduction',
  );

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-[800px] dark:border-slate-800 dark:bg-slate-950">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950">
            <DialogTitle className="pr-12">
              Payslip Breakdown: {props.payslip?.employee?.first_name}{' '}
              {props.payslip?.employee?.last_name}
            </DialogTitle>
            <DialogDescription>
              Detailed calculation snapshot for{' '}
              {props.payslip?.payroll_run?.name || 'this period'}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                  Earnings
                </h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {earnings.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.salary_component?.name}
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('en-IN', {
                              style: 'currency',
                              currency: 'INR',
                            }).format(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {earnings.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-muted-foreground py-4 text-center"
                          >
                            No earnings found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                  Deductions
                </h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deductions.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.salary_component?.name}
                          </TableCell>
                          <TableCell className="text-destructive text-right">
                            {new Intl.NumberFormat('en-IN', {
                              style: 'currency',
                              currency: 'INR',
                            }).format(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {deductions.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-muted-foreground py-4 text-center"
                          >
                            No deductions found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex justify-end gap-12">
              <div className="text-right">
                <p className="text-muted-foreground text-xs uppercase">
                  Gross Earnings
                </p>
                <p className="text-lg font-bold">
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  }).format(props.payslip?.gross_salary || 0)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs uppercase">
                  Total Deductions
                </p>
                <p className="text-destructive text-lg font-bold">
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  }).format(props.payslip?.deductions || 0)}
                </p>
              </div>
              <div className="bg-primary/5 rounded-lg px-4 py-2 text-right">
                <p className="text-primary text-xs font-semibold uppercase">
                  Net Pay
                </p>
                <p className="text-primary text-2xl font-black">
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  }).format(props.payslip?.net_salary || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
