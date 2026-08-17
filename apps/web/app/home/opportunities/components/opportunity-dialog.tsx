'use client';

import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@kit/ui/button';
import { DateTimePicker } from '@kit/ui/datetime-picker';
import { format } from 'date-fns';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@kit/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@kit/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';
import { cn } from '@kit/ui/utils';

import { useDebounce } from '~/lib/hooks/use-debounce';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getAccountsService } from '~/services/accounts.service';
import {
  createOpportunityService,
  updateOpportunityService,
} from '~/services/opportunities.service';
import { getWorkspaceCurrenciesService, type WorkspaceCurrency } from '~/services/workspace-currencies.service';
import { useLocalization } from '~/lib/localization/localization-provider';
import { ManageableStatusSelect } from '../../_components/manageable-status-select';

const formSchema = z.object({
  opportunity_name: z.string().min(1, 'Opportunity Name is required'),
  account_id: z.string().min(1, 'Account is required'),
  stage_id: z.string().min(1, 'Stage is required'),
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

interface OpportunityDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  opportunity?: any;
  defaultAccountId?: string;
  asFormOnly?: boolean;
  defaultStageId?: string;
}

export function OpportunityDialog({
  isOpen,
  onOpenChange,
  onSuccess,
  opportunity,
  defaultAccountId,
  asFormOnly = false,
  defaultStageId,
}: OpportunityDialogProps) {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useRBAC();
  const { formatCurrency } = useLocalization();
  const isEditMode = !!opportunity;
  const [openAccountCombobox, setOpenAccountCombobox] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const debouncedAccountSearchQuery = useDebounce(accountSearchQuery, 300);

  // Fetch Stages — removed; ManageableStatusSelect manages its own data

  // Fetch Accounts (for selection)
  const {
    data: accountsData = { data: [], count: 0 },
    isLoading: isAccountsLoading,
  } = useQuery({
    queryKey: ['accounts', currentWorkspace?.id, debouncedAccountSearchQuery],
    queryFn: () =>
      getAccountsService({
        workspaceId: currentWorkspace!.id,
        searchTerm: debouncedAccountSearchQuery,
      }),
    enabled: !!currentWorkspace?.id && isOpen,
  });

  const accounts = accountsData.data;

  // Fetch workspace currencies for the currency dropdown
  const { data: workspaceCurrencies = [] } = useQuery({
    queryKey: ['workspace-currencies', currentWorkspace?.id],
    queryFn: () => getWorkspaceCurrenciesService(currentWorkspace!.id),
    enabled: !!currentWorkspace?.id && isOpen,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      opportunity_name: '',
      account_id: '',
      stage_id: '',
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
    if (isOpen) {
      if (opportunity) {
        form.reset({
          opportunity_name: opportunity.opportunity_name || '',
          account_id: opportunity.account_id || '',
          stage_id: opportunity.stage_id || '',
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
      } else {
        form.reset({
          opportunity_name: '',
          account_id: defaultAccountId || '',
          stage_id: defaultStageId || '',
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
        });
      }
    }
  }, [opportunity, form, isOpen, defaultAccountId]);

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      const payload = {
        ...values,
        workspace_id: currentWorkspace!.id,
        amount: values.amount ? parseFloat(values.amount) : null,
        probability: values.probability ? parseInt(values.probability) : null,
        expected_close_date: values.expected_close_date || null,
      };

      if (isEditMode) {
        return updateOpportunityService(opportunity.id, payload);
      } else {
        return createOpportunityService(payload);
      }
    },
    onSuccess: () => {
      toast.success(
        `Opportunity ${isEditMode ? 'updated' : 'created'} successfully`,
      );
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      if (isEditMode) {
        queryClient.invalidateQueries({
          queryKey: ['opportunity', opportunity.id],
        });
      }
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} opportunity`);
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }

  const innerContent = (
    <div className={asFormOnly ? "flex h-full flex-col overflow-auto" : "flex max-h-[90vh] flex-col"}>
      {!asFormOnly && (
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Opportunity' : 'New Opportunity'}
          </DialogTitle>
        </DialogHeader>
      )}
      <Form {...form}>
        <form id="dialog-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-y-auto px-2 space-y-2 mb-2">
            <FormField
              control={form.control}
              name="opportunity_name"              
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opportunity Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Big Deal Q3" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Account</FormLabel>
                    <Popover
                      open={openAccountCombobox}
                      onOpenChange={setOpenAccountCombobox}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'justify-between font-normal h-[36px]',
                              !field.value && 'text-muted-foreground',
                            )}
                            disabled={isEditMode}
                          >
                            {field.value
                              ? accounts.find(
                                  (account: any) => account.id === field.value,
                                )?.account_name
                              : 'Select account'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search account..."
                            value={accountSearchQuery}
                            onValueChange={setAccountSearchQuery}
                          />
                          <CommandList>
                            <CommandEmpty>No account found.</CommandEmpty>
                            <CommandGroup>
                              {accounts.map((account: any) => (
                                <CommandItem
                                  value={account.account_name}
                                  key={account.id}
                                  onSelect={() => {
                                    form.setValue('account_id', account.id);
                                    setOpenAccountCombobox(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      account.id === field.value
                                        ? 'opacity-100'
                                        : 'opacity-0',
                                    )}
                                  />
                                  {account.account_name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stage_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    <FormControl>
                      <ManageableStatusSelect
                        moduleKey="opportunities"
                        workspaceId={currentWorkspace?.id ?? ''}
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={mutation.isPending}
                        placeholder="Select stage"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="dialog-form" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
    </div>
  );

  if (asFormOnly) {
    return innerContent;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-[600px]">
        {innerContent}
      </DialogContent>
    </Dialog>
  );
}
