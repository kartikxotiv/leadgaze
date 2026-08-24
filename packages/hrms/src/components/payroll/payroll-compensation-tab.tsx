'use client';

import type { ReactNode } from 'react';

import { Edit2, Plus, Trash2 } from 'lucide-react';

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
import { dataModelNotes } from '../page.data';

export function PayrollCompensationTab(props: {
  employeeAssignments: PayrollDashboardResponse['employeeAssignments'];
  onCreateAssignment: () => void;
  onEditAssignment: (
    assignment: PayrollDashboardResponse['employeeAssignments'][number],
  ) => void;
  onDeleteAssignment: (id: string) => void;
  canEdit?: boolean;
}) {
  return (
    <TabsContent value="compensation" className="mt-0">
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-3">
          <PayrollTableHeader
            title="Employee Compensation"
            description="One row represents one employee compensation assignment for a date range."
            action={
              props.canEdit ? (
                <Button onClick={props.onCreateAssignment}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Assignment
                </Button>
              ) : null
            }
          />

          <CustomTableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="sticky right-0 px-4 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.employeeAssignments.length > 0 ? (
                  props.employeeAssignments.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {item.employee}
                      </TableCell>
                      <TableCell>{item.assignment}</TableCell>
                      <TableCell>{item.period}</TableCell>
                      <TableCell>
                        <PayrollStatusBadge label={item.status} />
                      </TableCell>
                      <TableCell className="bg-card sticky right-0 px-4 text-right">
                        {props.canEdit && (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => props.onEditAssignment(item)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => props.onDeleteAssignment(item.id)}
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
                      No assignments found. Setup a salary structure first.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CustomTableContainer>
        </div>

        <CardWidgetContainer
          title="What Goes Where"
          desc="Simple rules to decide which table should store a payroll value."
          contentClassName="space-y-4 p-4"
        >
          {dataModelNotes.map((item) => (
            <div key={item.label} className="rounded-lg border p-4">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="mt-1 text-sm">{item.value}</p>
              <p className="text-muted-foreground mt-1 text-sm">{item.hint}</p>
            </div>
          ))}
        </CardWidgetContainer>
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
        <p className="text-muted-foreground mt-1 text-sm">
          {props.description}
        </p>
      </div>
      {props.action}
    </div>
  );
}
