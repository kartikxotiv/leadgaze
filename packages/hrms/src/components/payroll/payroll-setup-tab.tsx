/* eslint-disable @typescript-eslint/no-explicit-any */
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

import { PayrollStatusBadge } from '../page.components';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function PayrollSetupTab(props: {
  salaryComponents: any[];
  salaryStructures: PayrollDashboardResponse['salaryStructures'];
  onCreateComponent: () => void;
  onCreateStructure: () => void;
  onConfigureStructure: (structure: { id: string; name: string }) => void;
  onEditComponent: (component: any) => void;
  onDeleteComponent: (id: string) => void;
  onEditStructure: (structure: any) => void;
  onDeleteStructure: (id: string) => void;
  canEdit?: boolean;
}) {
  return (
    <TabsContent value="setup" className="mt-0">
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Components</CardTitle>
              <CardDescription>
                Reusable payroll heads like Basic, HRA, PF, bonus, and
                reimbursements.
              </CardDescription>
            </div>
            {props.canEdit && (
              <Button size="sm" onClick={props.onCreateComponent}>
                <Plus className="mr-2 h-4 w-4" />
                Add Component
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Taxable?</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.salaryComponents.length > 0 ? (
                  props.salaryComponents.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell className="font-medium">
                        {component.name}
                      </TableCell>
                      <TableCell>{component.type}</TableCell>
                      <TableCell>{component.taxable ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        <PayrollStatusBadge
                          label={component.is_active ? 'Live' : 'Inactive'}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {props.canEdit && (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => props.onEditComponent(component)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() =>
                                props.onDeleteComponent(component.id)
                              }
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
                    <TableCell colSpan={4} className="py-6 text-center">
                      No salary components found. Create one to start payroll
                      setup.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Salary Structures</CardTitle>
              <CardDescription>
                Default templates for common roles before employee-level
                overrides.
              </CardDescription>
            </div>
            {props.canEdit && (
              <Button size="sm" onClick={props.onCreateStructure}>
                <Plus className="mr-2 h-4 w-4" />
                Add Structure
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.salaryStructures.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.description ?? '-'}</TableCell>
                    <TableCell>{item.currency_code}</TableCell>
                    <TableCell>
                      <PayrollStatusBadge
                        label={item.is_active ? 'Live' : 'Inactive'}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {props.canEdit && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              props.onConfigureStructure({
                                id: item.id,
                                name: item.name,
                              })
                            }
                          >
                            Configure
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => props.onEditStructure(item)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => props.onDeleteStructure(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
