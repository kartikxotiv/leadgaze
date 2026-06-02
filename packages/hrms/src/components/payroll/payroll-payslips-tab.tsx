/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useQuery } from '@tanstack/react-query';

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

import { listPayslipsService } from '~/services/payroll.service';

import { formatCurrency } from '../utils';

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
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Generated Payslips</CardTitle>
          <CardDescription>
            Official payroll records for your employees. Click any row to see
            the breakdown.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Generated At</TableHead>
                <TableHead className="text-right">Action</TableHead>
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
                    {new Date(item.generated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
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
        </CardContent>
      </Card>
    </TabsContent>
  );
}
