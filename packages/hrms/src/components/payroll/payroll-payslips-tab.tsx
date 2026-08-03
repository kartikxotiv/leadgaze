/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useQuery } from '@tanstack/react-query';

import { Button } from '@kit/ui/button';
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

import { listPayslipsService } from '../../server/services/payroll.service';
import { formatCurrency } from '../utils';
import { formatDate } from '@kit/shared/utils';

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

export function PayrollPayslipsTab(props: {
  onViewDetails: (payslip: any) => void;
}) {
  const payslipsQuery = useQuery({
    queryKey: ['payslips-list'],
    queryFn: listPayslipsService,
  });

  const payslips = (payslipsQuery.data?.data as any[]) || [];

  return (
    <TabsContent value="payslips" className="mt-0">
      <div className="grid gap-2">
        <PayrollTableHeader
          title="Generated Payslips"
          description="Official payroll records for your employees. Click any row to see the breakdown."
        />

        <CustomTableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Generated At</TableHead>
                <TableHead className="sticky right-0 px-4 text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payslips.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => props.onViewDetails(item)}
                >
                  <TableCell className="font-medium">
                    {item.employee?.first_name} {item.employee?.last_name}
                  </TableCell>
                  <TableCell>{item.payroll_run?.name || '-'}</TableCell>
                  <TableCell>{formatCurrency(item.gross_salary)}</TableCell>
                  <TableCell className="text-primary font-semibold">
                    {formatCurrency(item.net_salary)}
                  </TableCell>
                  <TableCell>
                    {formatDate(item.generated_at)}
                  </TableCell>
                  <TableCell className="bg-card sticky right-0 px-4 text-right">
                    <Button size="sm" variant="ghost">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {payslips.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center">
                    No payslips found. Approve a payroll run to generate them.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CustomTableContainer>
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
