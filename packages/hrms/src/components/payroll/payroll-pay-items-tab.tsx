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
      <div className="grid gap-2">
        <PayrollTableHeader
          title="One-Time Pay Items"
          description="Use this for bonus, arrears, reimbursements, and recoveries. Do not mix these into recurring salary breakup."
          action={
            props.canEdit ? (
              <Button onClick={props.onCreateItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            ) : null
          }
        />

        <CustomTableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payable In</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="sticky right-0 px-4 text-right">
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
                    <TableCell className="sticky right-0 px-4 text-right">
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
        <h2 className="primary-heading leading-tight text-leadgaze-dark dark:text-white">{props.title}</h2>
        <p className="primary-text-regular text-muted-foreground mt-1">
          {props.description}
        </p>
      </div>
      {props.action}
    </div>
  );
}
