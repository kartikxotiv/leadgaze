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

import type { PayrollDashboardResponse } from '~/types/payroll.type';

import { dataModelNotes } from '../page.data';
import { PayrollStatusBadge } from '../page.components';

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
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Employee Compensation</CardTitle>
              <CardDescription>
                One row represents one employee compensation assignment for a date range.
              </CardDescription>
            </div>
            {props.canEdit && (
              <Button size="sm" onClick={props.onCreateAssignment}>
                <Plus className="mr-2 h-4 w-4" />
                Add Assignment
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.employeeAssignments.length > 0 ? (
                  props.employeeAssignments.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.employee}</TableCell>
                      <TableCell>{item.assignment}</TableCell>
                      <TableCell>{item.period}</TableCell>
                      <TableCell>
                        <PayrollStatusBadge label={item.status} />
                      </TableCell>
                      <TableCell className="text-right">
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
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      No assignments found. Setup a salary structure first.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>What Goes Where</CardTitle>
            <CardDescription>
              Simple rules to decide which table should store a payroll value.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dataModelNotes.map((item) => (
              <div key={item.label} className="rounded-lg border p-4">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-1 text-sm">{item.value}</p>
                <p className="text-muted-foreground mt-1 text-sm">{item.hint}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
