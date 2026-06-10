'use client';

import type { ReactNode } from 'react';

import { Edit2, Plus, Trash2 } from 'lucide-react';

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
      <div className="grid gap-3">
        <PayrollTableHeader
          title="One-Time Pay Items"
          description="Use this for bonus, arrears, reimbursements, and recoveries. Do not mix these into recurring salary breakup."
          action={
            props.canEdit ? (
              <Button size="sm" onClick={props.onCreateItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            ) : null
          }
        />

        <CustomTableContainer>
          <Table>
            <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payable In</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="bg-card sticky right-0 px-4 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.payItems.length > 0 ? (
                props.payItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {item.employee}
                    </TableCell>
                    <TableCell>{item.item}</TableCell>
                    <TableCell>{formatCurrency(item.amount)}</TableCell>
                    <TableCell>{item.payable}</TableCell>
                    <TableCell>
                      <PayrollStatusBadge label={item.status} />
                    </TableCell>
                    <TableCell className="bg-card sticky right-0 px-4 text-right">
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
                    colSpan={6}
                    className="text-muted-foreground py-6 text-center"
                  >
                    No one-time pay items found.
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

function PayrollTableHeader(props: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-base font-semibold leading-tight">{props.title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {props.description}
        </p>
      </div>
      {props.action}
    </div>
  );
}
