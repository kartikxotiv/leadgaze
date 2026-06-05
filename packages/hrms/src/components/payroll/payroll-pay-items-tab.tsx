'use client';

import { Edit2, Plus, Trash2 } from 'lucide-react';

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

import type { PayrollDashboardResponse } from '../../types/payroll.type';
import { PayrollStatusBadge } from '../page.components';
import { formatCurrency } from '../utils';

export function PayrollPayItemsTab(props: {
  payItems: PayrollDashboardResponse['payItems'];
  onCreateItem: () => void;
  onEditItem: (item: PayrollDashboardResponse['payItems'][number]) => void;
  onDeleteItem: (id: string) => void;
  canEdit?: boolean;
}) {
  return (
    <TabsContent value="pay-items" className="mt-0">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>One-Time Pay Items</CardTitle>
            <CardDescription>
              Use this for bonus, arrears, reimbursements, and recoveries. Do
              not mix these into recurring salary breakup.
            </CardDescription>
          </div>
          {props.canEdit && (
            <Button size="sm" onClick={props.onCreateItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payable In</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.payItems.length > 0 ? (
                props.payItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.employee}
                    </TableCell>
                    <TableCell>{item.item}</TableCell>
                    <TableCell>{formatCurrency(item.amount)}</TableCell>
                    <TableCell>{item.payable}</TableCell>
                    <TableCell>
                      <PayrollStatusBadge label={item.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {props.canEdit && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => props.onEditItem(item)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => props.onDeleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground py-6 text-center"
                  >
                    No one-time pay items found.
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
