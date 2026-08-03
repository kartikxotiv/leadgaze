/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { FormEvent, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import {
  addSalaryStructureComponentService,
  listSalaryComponentsService,
  listSalaryStructureComponentsService,
} from '../../server/services/payroll.service';
import { handleApiResponse } from '../../utils/api-response-handler';

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

export function SalaryStructureComponentsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  structure: { id: string; name: string } | null;
}) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    salary_component_id: '',
    calculation_type: 'percentage_of_ctc',
    calculation_value: '',
  });

  const componentsQuery = useQuery({
    queryKey: ['salary-structure-components', props.structure?.id],
    queryFn: () => listSalaryStructureComponentsService(props.structure!.id),
    enabled: !!props.structure?.id && props.open,
  });

  const masterComponentsQuery = useQuery({
    queryKey: ['salary-components'],
    queryFn: listSalaryComponentsService,
    enabled: props.open,
  });

  const addMutation = useMutation({
    mutationFn: addSalaryStructureComponentService,
    onSuccess: (response) => {
      handleApiResponse(response);
      queryClient.invalidateQueries({
        queryKey: ['salary-structure-components', props.structure?.id],
      });
      setIsAdding(false);
      setForm({
        salary_component_id: '',
        calculation_type: 'percentage_of_ctc',
        calculation_value: '',
      });
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!props.structure) return;

    addMutation.mutate({
      structureId: props.structure.id,
      payload: {
        salary_component_id: form.salary_component_id,
        calculation_type: form.calculation_type,
        calculation_value: Number(form.calculation_value),
      },
    });
  };

  const structureComponents = (componentsQuery.data?.data as any[]) || [];
  const masterComponents = (masterComponentsQuery.data?.data as any[]) || [];

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-[700px] dark:border-slate-800 dark:bg-slate-950">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader>
            <DialogTitle>
              Configure Structure: {props.structure?.name}
            </DialogTitle>
            <DialogDescription>
              Add salary components and define their calculation logic for this
              structure.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Line Items</h4>
              {!isAdding && (
                <Button size="sm" onClick={() => setIsAdding(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Component
                </Button>
              )}
            </div>

            {isAdding && (
              <form
                onSubmit={onSubmit}
                className="bg-muted/30 rounded-lg border p-4"
              >
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Component</Label>
                    <Select
                      value={form.salary_component_id}
                      onValueChange={(v) =>
                        setForm({ ...form, salary_component_id: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {masterComponents.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Calculation</Label>
                    <Select
                      value={form.calculation_type}
                      onValueChange={(v) =>
                        setForm({ ...form, calculation_type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage_of_ctc">
                          % of CTC
                        </SelectItem>
                        <SelectItem value="percentage_of_basic">
                          % of Basic
                        </SelectItem>
                        <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Value</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.calculation_value}
                      onChange={(e) =>
                        setForm({ ...form, calculation_value: e.target.value })
                      }
                      placeholder="e.g. 50"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsAdding(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    type="submit"
                    disabled={addMutation.isPending}
                  >
                    {addMutation.isPending ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              </form>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Calculation</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {structureComponents.length > 0 ? (
                    structureComponents.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.salary_component?.name}
                        </TableCell>
                        <TableCell className="capitalize">
                          {item.salary_component?.type.replace('_', ' ')}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm italic">
                          {item.calculation_type.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.calculation_type.includes('percentage')
                            ? `${item.calculation_value}%`
                            : item.calculation_value}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-muted-foreground h-24 text-center"
                      >
                        No components added to this structure yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
