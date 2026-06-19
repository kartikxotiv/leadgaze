'use client';

import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useUser } from '@kit/supabase/hooks/use-user';
import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Textarea } from '@kit/ui/textarea';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { Account, updateAccountService } from '~/services/accounts.service';

import { IndustrySelect } from '../../../_components/industry-select';
import { ManageableStatusSelect } from '../../../_components/manageable-status-select';

const formSchema = z.object({
  account_name: z.string().min(1, 'Account Name is required'),
  website: z.string().optional().or(z.literal('')),
  phone_number: z.string().optional().or(z.literal('')),
  industry_id: z.string().optional().or(z.literal('')),
  company_size: z.string().optional().or(z.literal('')),
  annual_revenue: z.string().optional().or(z.literal('')),
  employee_count: z.string().optional().or(z.literal('')),
  account_type: z.string().optional(),
  billing_street: z.string().optional().or(z.literal('')),
  billing_city: z.string().optional().or(z.literal('')),
  billing_state: z.string().optional().or(z.literal('')),
  billing_postal_code: z.string().optional().or(z.literal('')),
  billing_country: z.string().optional().or(z.literal('')),
  shipping_street: z.string().optional().or(z.literal('')),
  shipping_city: z.string().optional().or(z.literal('')),
  shipping_state: z.string().optional().or(z.literal('')),
  shipping_postal_code: z.string().optional().or(z.literal('')),
  shipping_country: z.string().optional().or(z.literal('')),
  linkedin_url: z.string().optional().or(z.literal('')),
  twitter_handle: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
});

interface EditAccountDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account;
}

export function EditAccountDialog({
  isOpen,
  onOpenChange,
  account,
}: EditAccountDialogProps) {
  const { currentWorkspace: workspace } = useRBAC();
  const { data: user } = useUser();
  const queryClient = useQueryClient();

  const isWorkspaceOwner = workspace?.owner_id === user?.id;
  const isCreator = account.created_by === user?.id;
  const canChangeVisibility = isWorkspaceOwner || isCreator;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      account_name: '',
      website: '',
      phone_number: '',
      industry_id: '',
      company_size: '',
      annual_revenue: '',
      employee_count: '',
      account_type: '',
      billing_street: '',
      billing_city: '',
      billing_state: '',
      billing_postal_code: '',
      billing_country: '',
      shipping_street: '',
      shipping_city: '',
      shipping_state: '',
      shipping_postal_code: '',
      shipping_country: '',
      linkedin_url: '',
      twitter_handle: '',
      description: '',
    },
  });

  useEffect(() => {
    if (isOpen && account) {
      form.reset({
        account_name: account.account_name || '',
        website: account.website || '',
        phone_number: account.phone_number || '',
        industry_id: account.industry_id || '',
        company_size: account.company_size || '',
        annual_revenue: account.annual_revenue
          ? String(account.annual_revenue)
          : '',
        employee_count: account.employee_count
          ? String(account.employee_count)
          : '',
        account_type: account.account_type || undefined,
        billing_street: account.billing_street || '',
        billing_city: account.billing_city || '',
        billing_state: account.billing_state || '',
        billing_postal_code: account.billing_postal_code || '',
        billing_country: account.billing_country || '',
        shipping_street: account.shipping_street || '',
        shipping_city: account.shipping_city || '',
        shipping_state: account.shipping_state || '',
        shipping_postal_code: account.shipping_postal_code || '',
        shipping_country: account.shipping_country || '',
        linkedin_url: account.linkedin_url || '',
        twitter_handle: account.twitter_handle || '',
        description: account.description || '',
      });
    }
  }, [account, form, isOpen]);

  const updateMutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      const payload: any = {
        ...values,
        annual_revenue: values.annual_revenue
          ? parseFloat(values.annual_revenue)
          : null,
        employee_count: values.employee_count
          ? parseInt(values.employee_count)
          : null,
        account_type:
          values.account_type && values.account_type !== ''
            ? values.account_type
            : null,
      };
      return updateAccountService(account.id, payload);
    },
    onSuccess: () => {
      toast.success('Account updated successfully');
      queryClient.invalidateQueries({ queryKey: ['account', account.id] });
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to update account'),
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateMutation.mutate(values);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-[700px]">
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Update the information for this account.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id="dialog-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 space-y-4 overflow-y-auto px-6 py-4"
          >
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="account_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://example.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="industry_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <FormControl>
                        <IndustrySelect
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={updateMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="account_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <ManageableStatusSelect
                          moduleKey="accounts"
                          workspaceId={workspace?.id ?? ''}
                          value={field.value ?? ''}
                          onValueChange={field.onChange}
                          disabled={updateMutation.isPending}
                          placeholder="Select type"
                        />
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
              </TabsContent>

              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="annual_revenue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Annual Revenue</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employee_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employees</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="company_size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Size Range</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 1-10, 50-100" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="address" className="space-y-4 pt-4">
                <div className="space-y-4">
                  <h4 className="text-primary text-sm font-medium">
                    Billing Address
                  </h4>
                  <FormField
                    control={form.control}
                    name="billing_street"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="Street" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="billing_city"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="City" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billing_state"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="State" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billing_postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="Zip" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billing_country"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="Country" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h4 className="text-primary text-sm font-medium">
                    Shipping Address
                  </h4>
                  <FormField
                    control={form.control}
                    name="shipping_street"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="Street" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="shipping_city"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="City" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shipping_state"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="State" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shipping_postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="Zip" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shipping_country"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="Country" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="social" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="linkedin_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn URL</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="twitter_handle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twitter Handle</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>
          </form>
        </Form>
        <DialogFooter className="mt-auto border-t p-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
            className="mb-2"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="dialog-form"
            disabled={updateMutation.isPending}
            className="mb-2"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
