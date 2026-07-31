'use client';

import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
import { DateTimePicker } from '@kit/ui/datetime-picker';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@kit/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  Opportunity,
  updateOpportunityService,
} from '~/services/opportunities.service';
import { getWorkspaceCurrenciesService, type WorkspaceCurrency } from '~/services/workspace-currencies.service';
import { useLocalization } from '~/lib/localization/localization-provider';

const formSchema = z.object({
  opportunity_name: z.string().min(1, 'Opportunity Name is required'),
  amount: z.string().optional().or(z.literal('')),
  currency: z.string().optional().or(z.literal('')),
  probability: z.string().optional().or(z.literal('')),
  expected_close_date: z.string().optional().or(z.literal('')),
  priority: z.string().optional(),
  opportunity_type: z.string().optional(),
  lead_source: z.string().optional(),
  description: z.string().optional().or(z.literal('')),
  competitor: z.string().optional().or(z.literal('')),
  is_closed: z.boolean().optional(),
  is_won: z.boolean().optional(),
  close_reason: z.string().optional().or(z.literal('')),
});

interface EditOpportunityDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: Opportunity;
}

export function EditOpportunityDialog({
  isOpen,
  onOpenChange,
  opportunity,
}: EditOpportunityDialogProps) {
  const { currentWorkspace: workspace } = useRBAC();
  const queryClient = useQueryClient();
  const { formatCurrency } = useLocalization();

  // Fetch workspace currencies for the currency dropdown
  const { data: workspaceCurrencies = [] } = useQuery({
    queryKey: ['workspace-currencies', workspace?.id],
    queryFn: () => getWorkspaceCurrenciesService(workspace!.id),
    enabled: !!workspace?.id && isOpen,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      opportunity_name: '',
      amount: '',
      currency: 'USD',
      probability: '',
      expected_close_date: '',
      priority: '',
      opportunity_type: '',
      lead_source: '',
      description: '',
      competitor: '',
      is_closed: false,
      is_won: false,
      close_reason: '',
    },
  });

  useEffect(() => {
    if (isOpen && opportunity) {
      form.reset({
        opportunity_name: opportunity.opportunity_name || '',
        amount: opportunity.amount ? String(opportunity.amount) : '',
        currency: opportunity.currency || 'USD',
        probability: opportunity.probability
          ? String(opportunity.probability)
          : '',
        expected_close_date: opportunity.expected_close_date
          ? new Date(opportunity.expected_close_date)
              .toISOString()
              .split('T')[0]
          : '',
        priority: opportunity.priority || undefined,
        opportunity_type: opportunity.opportunity_type || undefined,
        lead_source: opportunity.lead_source || undefined,
        description: opportunity.description || '',
        competitor: opportunity.competitor || '',
        is_closed: opportunity.is_closed || false,
        is_won: opportunity.is_won || false,
        close_reason: opportunity.close_reason || '',
      });
    }
  }, [opportunity, form, isOpen]);

  const updateMutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      const payload: any = {
        ...values,
        amount: values.amount ? parseFloat(values.amount) : null,
        probability: values.probability ? parseInt(values.probability) : null,
        expected_close_date: values.expected_close_date || null,
      };

      return updateOpportunityService(opportunity.id, payload);
    },
    onSuccess: () => {
      toast.success('Opportunity updated successfully');
      queryClient.invalidateQueries({
        queryKey: ['opportunity', opportunity.id],
      });
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to update opportunity'),
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateMutation.mutate(values);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Opportunity</DialogTitle>
          <DialogDescription>
            Update the information for this opportunity.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="dialog-form" onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-2 space-y-2">
            <FormField
              control={form.control}
              name="opportunity_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opportunity Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {workspaceCurrencies.map((cur: WorkspaceCurrency) => (
                          <SelectItem key={cur.currency_code} value={cur.currency_code}>
                            {cur.currency_symbol} {cur.currency_code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="probability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Probability (%)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" max="100" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expected_close_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Close Date</FormLabel>
                    <FormControl>
                      <DateTimePicker mode="date" placeholder="Select date" value={field.value ? new Date(field.value) : undefined} onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="opportunity_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="New Business">
                          New Business
                        </SelectItem>
                        <SelectItem value="Existing Business">
                          Existing Business
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="lead_source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead Source</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="competitor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Competitor</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-medium">Outcome</h4>
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="is_closed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-y-0 space-x-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Is Closed</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_won"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-y-0 space-x-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Is Won</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {form.watch('is_closed') && (
                <FormField
                  control={form.control}
                  name="close_reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Close Reason</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Why was this won or lost?"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

            </div>

            
          </form>
        </Form>
        <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" form="dialog-form" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
