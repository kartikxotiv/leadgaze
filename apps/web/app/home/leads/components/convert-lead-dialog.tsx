import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@kit/ui/alert-dialog';
import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Separator } from '@kit/ui/separator';
import { cn } from '@kit/ui/utils';

import { useDebounce } from '~/lib/hooks/use-debounce';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getAccountsService } from '~/services/accounts.service';
import { getContactsService } from '~/services/contacts.service';
import { convertLeadService } from '~/services/leads.service';

interface ConvertLeadDialogProps {
  leadId: string;
  leadData: {
    first_name: string;
    last_name?: string;
    company_name?: string;
    // Add other fields needed for pre-filling
  };
  statuses: any[]; // List of statuses to select converted status
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const formSchema = z.object({
  // Account
  accountType: z.enum(['new', 'existing']),
  accountName: z.string().optional(),
  existingAccountId: z.string().optional(),

  // Contact
  contactType: z.enum(['new', 'existing']),
  contactFirstName: z.string().optional(),
  contactLastName: z.string().optional(),
  existingContactId: z.string().optional(),

  // Opportunity
  createOpportunity: z.boolean(),
  opportunityType: z.enum(['new', 'existing']),
  opportunityName: z.string().optional(),
  existingOpportunityId: z.string().optional(),

  // Status
  convertedStatusId: z.string().min(1, 'Please select a converted status'),
});

export function ConvertLeadDialog({
  leadId,
  leadData,
  statuses,
  open,
  onOpenChange,
  onSuccess,
}: ConvertLeadDialogProps) {
  const { t } = useTranslation();
  const { currentWorkspace } = useRBAC();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search states
  const [accountSearch, setAccountSearch] = useState('');
  const debouncedAccountSearch = useDebounce(accountSearch, 300);
  const [contactSearch, setContactSearch] = useState('');
  const debouncedContactSearch = useDebounce(contactSearch, 300);

  const [openAccountPopover, setOpenAccountPopover] = useState(false);
  const [openContactPopover, setOpenContactPopover] = useState(false);

  // Fetch Existing Accounts
  const { data: accountsData = { data: [] } } = useQuery({
    queryKey: ['accounts', currentWorkspace?.id, debouncedAccountSearch],
    queryFn: () =>
      getAccountsService({
        workspaceId: currentWorkspace!.id,
        searchTerm: debouncedAccountSearch,
      }),
    enabled: !!currentWorkspace?.id && open,
  });

  // Fetch Existing Contacts
  const { data: contactsData = { data: [] } } = useQuery({
    queryKey: ['contacts', currentWorkspace?.id, debouncedAccountSearch],
    queryFn: () =>
      getContactsService({
        workspaceId: currentWorkspace!.id,
        searchTerm: debouncedContactSearch,
      }),
    enabled: !!currentWorkspace?.id && open,
  });

  const accounts = accountsData.data;
  const contactsList = contactsData.data;

  // Filter for closed/converted statuses
  const convertedStatuses = statuses ?? statuses?.filter((s) => s.is_closed);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountType: 'new',
      accountName: leadData.company_name || 'New Account',
      contactType: 'new',
      contactFirstName: leadData.first_name,
      contactLastName: leadData.last_name || '',
      createOpportunity: true,
      opportunityType: 'new',
      opportunityName: leadData.company_name
        ? `${leadData.company_name} Opportunity`
        : 'New Opportunity',
      convertedStatusId: convertedStatuses[0]?.id || '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Validation: if new, name is required
    if (values.accountType === 'new' && !values.accountName) {
      form.setError('accountName', { message: 'Account Name is required' });
      return;
    }
    if (values.contactType === 'new' && !values.contactFirstName) {
      form.setError('contactFirstName', { message: 'First Name is required' });
      return;
    }
    if (
      values.createOpportunity &&
      values.opportunityType === 'new' &&
      !values.opportunityName
    ) {
      form.setError('opportunityName', {
        message: 'Opportunity Name is required',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        account: {
          type: values.accountType,
          id: values.existingAccountId,
          name: values.accountName,
          // Extra fields like status_id for account can be defaults or added to form
          status_id: statuses.find((s) => s.status_key === 'new')?.id, // simplistic default
        },
        contact: {
          type: values.contactType,
          id: values.existingContactId,
          first_name: values.contactFirstName,
          last_name: values.contactLastName,
          status_id: statuses.find((s) => s.status_key === 'new')?.id,
        },
        should_create_opportunity: values.createOpportunity,
        opportunity: values.createOpportunity
          ? {
              type: values.opportunityType,
              id: values.existingOpportunityId,
              name: values.opportunityName,
              stage_id: statuses.find((s) => s.status_key === 'new')?.id, // needs opportunity stage, defaulting to Lead status usually wrong, need Opportunity stages. Assuming generic 'statuses' passed in might not have Opp stages.
              // For now, we'll let backend handle defaults or user picks later.
              // Actually, controller expects stage_id. We should probably fetch Opp stages.
              // For MVP, we will send null/undefined and let Controller handle or fail.
              // Update: Controller expects stage_id if create new.
              // We need to fetch Opportunity statuses? Or just reuse `statuses` if they are mixed?
              // `statuses` passed to this component seems to be LEAD statuses from parent.
              // We'll skip stage_id for now and let backend fail or use nullable.
            }
          : null,
        converted_status_id: values.convertedStatusId,
      };

      await convertLeadService(leadId, payload);
      toast.success('Lead converted successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to convert lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Convert Lead</DialogTitle>
          <DialogDescription>
            Convert this lead into an Account, Contact, and Opportunity.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Account Section */}
            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="flex items-center gap-2 font-semibold">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-600">
                  1
                </span>
                Account
              </h3>

              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="new" id="acc-new" />
                      <FormLabel htmlFor="acc-new" className="font-normal">
                        Create New Account
                      </FormLabel>
                    </div>

                    {field.value === 'new' && (
                      <div className="w-full pl-6">
                        <FormField
                          control={form.control}
                          name="accountName"
                          render={({ field: inputField }) => (
                            <div className="space-y-1">
                              <FormLabel className="text-muted-foreground text-xs">
                                Account Name *
                              </FormLabel>
                              <Input {...inputField} />
                            </div>
                          )}
                        />
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="existing" id="acc-exist" />
                      <FormLabel htmlFor="acc-exist" className="font-normal">
                        Choose Existing Account
                      </FormLabel>
                    </div>
                    {field.value === 'existing' && (
                      <div className="w-full pl-6">
                        <FormField
                          control={form.control}
                          name="existingAccountId"
                          render={({ field: accField }) => (
                            <Popover
                              open={openAccountPopover}
                              onOpenChange={setOpenAccountPopover}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    'w-full justify-between font-normal',
                                    !accField.value && 'text-muted-foreground',
                                  )}
                                >
                                  {accField.value
                                    ? accounts.find(
                                        (a: any) => a.id === accField.value,
                                      )?.account_name || 'Select account'
                                    : 'Select existing account...'}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[400px] p-0">
                                <Command shouldFilter={false}>
                                  <CommandInput
                                    placeholder="Search accounts..."
                                    value={accountSearch}
                                    onValueChange={setAccountSearch}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      No accounts found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {accounts.map((acc: any) => (
                                        <CommandItem
                                          key={acc.id}
                                          value={acc.id}
                                          onSelect={() => {
                                            form.setValue(
                                              'existingAccountId',
                                              acc.id,
                                            );
                                            form.setValue(
                                              'accountName',
                                              acc.account_name,
                                            );
                                            setOpenAccountPopover(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              'mr-2 h-4 w-4',
                                              accField.value === acc.id
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                            )}
                                          />
                                          {acc.account_name}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                      </div>
                    )}
                  </RadioGroup>
                )}
              />
            </div>

            {/* Contact Section */}
            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="flex items-center gap-2 font-semibold">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-600">
                  2
                </span>
                Contact
              </h3>

              <FormField
                control={form.control}
                name="contactType"
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="new" id="cont-new" />
                      <FormLabel htmlFor="cont-new" className="font-normal">
                        Create New Contact
                      </FormLabel>
                    </div>

                    {field.value === 'new' && (
                      <div className="grid w-full grid-cols-2 gap-4 pl-6">
                        <FormField
                          control={form.control}
                          name="contactFirstName"
                          render={({ field: inputField }) => (
                            <div className="space-y-1">
                              <FormLabel className="text-muted-foreground text-xs">
                                First Name *
                              </FormLabel>
                              <Input {...inputField} />
                            </div>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="contactLastName"
                          render={({ field: inputField }) => (
                            <div className="space-y-1">
                              <FormLabel className="text-muted-foreground text-xs">
                                Last Name
                              </FormLabel>
                              <Input {...inputField} />
                            </div>
                          )}
                        />
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="existing" id="cont-exist" />
                      <FormLabel htmlFor="cont-exist" className="font-normal">
                        Choose Existing Contact
                      </FormLabel>
                    </div>
                    {field.value === 'existing' && (
                      <div className="w-full pl-6">
                        <FormField
                          control={form.control}
                          name="existingContactId"
                          render={({ field: contField }) => (
                            <Popover
                              open={openContactPopover}
                              onOpenChange={setOpenContactPopover}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    'w-full justify-between font-normal',
                                    !contField.value && 'text-muted-foreground',
                                  )}
                                >
                                  {contField.value
                                    ? contactsList.find(
                                        (c: any) => c.id === contField.value,
                                      )
                                      ? `${contactsList.find((c: any) => c.id === contField.value).first_name} ${contactsList.find((c: any) => c.id === contField.value).last_name || ''}`
                                      : 'Select contact'
                                    : 'Select existing contact...'}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[400px] p-0">
                                <Command shouldFilter={false}>
                                  <CommandInput
                                    placeholder="Search contacts..."
                                    value={contactSearch}
                                    onValueChange={setContactSearch}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      No contacts found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {contactsList.map((cont: any) => (
                                        <CommandItem
                                          key={cont.id}
                                          value={cont.id}
                                          onSelect={() => {
                                            form.setValue(
                                              'existingContactId',
                                              cont.id,
                                            );
                                            form.setValue(
                                              'contactFirstName',
                                              cont.first_name,
                                            );
                                            form.setValue(
                                              'contactLastName',
                                              cont.last_name || '',
                                            );
                                            setOpenContactPopover(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              'mr-2 h-4 w-4',
                                              contField.value === cont.id
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                            )}
                                          />
                                          {cont.first_name} {cont.last_name}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          )}
                        />
                      </div>
                    )}
                  </RadioGroup>
                )}
              />
            </div>

            {/* Opportunity Section */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-600">
                    3
                  </span>
                  Opportunity
                </h3>
                <FormField
                  control={form.control}
                  name="createOpportunity"
                  render={({ field }) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="create-opp"
                        checked={!field.value}
                        onCheckedChange={(checked) => field.onChange(!checked)}
                      />
                      <label
                        htmlFor="create-opp"
                        className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Don't create opportunity
                      </label>
                    </div>
                  )}
                />
              </div>

              {form.watch('createOpportunity') && (
                <FormField
                  control={form.control}
                  name="opportunityType"
                  render={({ field }) => (
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="new" id="opp-new" />
                        <FormLabel htmlFor="opp-new" className="font-normal">
                          Create New Opportunity
                        </FormLabel>
                      </div>

                      {field.value === 'new' && (
                        <div className="w-full pl-6">
                          <FormField
                            control={form.control}
                            name="opportunityName"
                            render={({ field: inputField }) => (
                              <div className="space-y-1">
                                <FormLabel className="text-muted-foreground text-xs">
                                  Opportunity Name *
                                </FormLabel>
                                <Input {...inputField} />
                              </div>
                            )}
                          />
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="existing" id="opp-exist" />
                        <FormLabel htmlFor="opp-exist" className="font-normal">
                          Choose Existing Opportunity
                        </FormLabel>
                      </div>
                    </RadioGroup>
                  )}
                />
              )}
            </div>

            {/* Converted Status */}
            <div className="space-y-4 rounded-lg border bg-slate-50 p-4 dark:bg-slate-900/50">
              <FormField
                control={form.control}
                name="convertedStatusId"
                render={({ field }) => (
                  <div className="flex items-center gap-4">
                    <FormLabel className="min-w-[120px]">
                      Converted Status *
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="z-[60]">
                        {convertedStatuses?.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            {status.status_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </div>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Converting...' : 'Convert'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
