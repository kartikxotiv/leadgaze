'use client';

import { useEffect, useState } from 'react';

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
import { useFieldPermissions } from '~/lib/hooks/use-field-permissions';
import { useDynamicColumns } from '~/lib/hooks/use-dynamic-columns';
import { LeadCustomFieldInputs } from '~/components/leads/lead-custom-field-inputs';
import { Contact, updateContactService } from '~/services/contacts.service';

const formSchema = z.object({
  first_name: z.string().min(1, 'First Name is required'),
  last_name: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  alt_email: z.string().email().optional().or(z.literal('')),
  phone_number: z.string().optional().or(z.literal('')),
  mobile_number: z.string().optional().or(z.literal('')),
  alt_phone: z.string().optional().or(z.literal('')),
  job_title: z.string().optional().or(z.literal('')),
  department: z.string().optional().or(z.literal('')),
  // Note: address fields removed as they don't exist in crm_contacts table
  location: z.string().optional().or(z.literal('')),
  timezone: z.string().optional().or(z.literal('')),
  language: z.string().optional().or(z.literal('')),
  preferred_contact_method: z.string().optional(),
  do_not_call: z.boolean().optional(),
  do_not_email: z.boolean().optional(),
  linkedin_url: z.string().optional().or(z.literal('')),
  twitter_handle: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

interface EditContactDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
}

/** Renders children (a form field) only when the user has edit permission for the given FLS field_key. */
function FieldGuard({
  fieldKey,
  canEdit,
  children,
}: {
  fieldKey: string;
  canEdit: (key: string) => boolean;
  children: React.ReactNode;
}) {
  if (!canEdit(fieldKey)) return null;
  return <>{children}</>;
}

export function EditContactDialog({
  isOpen,
  onOpenChange,
  contact,
}: EditContactDialogProps) {
  const { currentWorkspace: workspace } = useRBAC();
  const { data: user } = useUser();
  const queryClient = useQueryClient();
  const { canEdit, canView, isLoading: permissionsLoading } = useFieldPermissions({
    entityType: 'contacts',
    workspaceId: workspace?.id,
    enabled: isOpen && !!workspace?.id,
  });

  const { fields = [] } = useDynamicColumns({
    entityType: 'contacts',
    workspaceId: workspace?.id,
    userId: user?.id,
    enabled: isOpen && !!workspace?.id,
  });

  const visibleCustomFields = fields.filter((f) => !f.is_system);
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      alt_email: '',
      phone_number: '',
      mobile_number: '',
      alt_phone: '',
      job_title: '',
      department: '',
      location: '',
      timezone: '',
      language: '',
      preferred_contact_method: '',
      do_not_call: false,
      do_not_email: false,
      linkedin_url: '',
      twitter_handle: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen && contact) {
      form.reset({
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        alt_email: contact.alt_email || '',
        phone_number: contact.phone_number || '',
        mobile_number: contact.mobile_number || '',
        alt_phone: contact.alt_phone || '',
        job_title: contact.job_title || '',
        department: contact.department || '',
        location: contact.location || '',
        timezone: contact.timezone || '',
        language: contact.language || '',
        preferred_contact_method: contact.preferred_contact_method || undefined,
        do_not_call: contact.do_not_call || false,
        do_not_email: contact.do_not_email || false,
        linkedin_url: contact.linkedin_url || '',
        twitter_handle: contact.twitter_handle || '',
        notes: contact.notes || '',
      });
      setCustomFields((contact.custom_fields as Record<string, unknown>) || {});
    }
  }, [contact, form, isOpen]);

  const updateMutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema> & { custom_fields?: any }) => {
      const payload: any = { ...values };
      return updateContactService(contact.id, payload);
    },
    onSuccess: () => {
      toast.success('Contact updated successfully');
      queryClient.invalidateQueries({ queryKey: ['contact', contact.id] });
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to update contact'),
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Filter out fields user cannot edit
    const payload: any = { ...values };
    const filteredPayload: any = {};
    for (const [key, val] of Object.entries(payload)) {
      if (canEdit(key)) {
        filteredPayload[key] = val;
      }
    }
    filteredPayload.custom_fields = {};
    for (const [key, val] of Object.entries(customFields)) {
      if (canEdit(key)) {
        filteredPayload.custom_fields[key] = val;
      }
    }
    updateMutation.mutate(filteredPayload);
  }

  if (permissionsLoading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>
            Update the information for this contact.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="dialog-form" onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <Tabs defaultValue="basic" className="w-full h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="additional">Additional Details</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 py-4 flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <FieldGuard fieldKey="first_name" canEdit={canEdit}>
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FieldGuard>
                  <FieldGuard fieldKey="last_name" canEdit={canEdit}>
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </FieldGuard>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FieldGuard fieldKey="email" canEdit={canEdit}>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </FieldGuard>
                  <FieldGuard fieldKey="alt_email" canEdit={canEdit}>
                    <FormField
                      control={form.control}
                      name="alt_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alternate Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </FieldGuard>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FieldGuard fieldKey="phone" canEdit={canEdit}>
                    <FormField
                      control={form.control}
                      name="phone_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </FieldGuard>
                  <FieldGuard fieldKey="mobile" canEdit={canEdit}>
                    <FormField
                      control={form.control}
                      name="mobile_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </FieldGuard>
                  <FieldGuard fieldKey="alt_phone" canEdit={canEdit}>
                    <FormField
                      control={form.control}
                      name="alt_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alt Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </FieldGuard>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FieldGuard fieldKey="job_title" canEdit={canEdit}>
                    <FormField
                      control={form.control}
                      name="job_title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </FieldGuard>
                  <FieldGuard fieldKey="department" canEdit={canEdit}>
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </FieldGuard>
                </div>

                <FieldGuard fieldKey="notes" canEdit={canEdit}>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea className="h-24" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </FieldGuard>
              </TabsContent>

              <TabsContent value="additional" className="space-y-4 py-4 flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <FieldGuard fieldKey="location" canEdit={canEdit}>
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </FieldGuard>
                  <FieldGuard fieldKey="timezone" canEdit={canEdit}>
                    <FormField
                      control={form.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </FieldGuard>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FieldGuard fieldKey="language" canEdit={canEdit}>
                    <FormField
                      control={form.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Language</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </FieldGuard>
                  <FieldGuard fieldKey="preferred_contact_method" canEdit={canEdit}>
                    <FormField
                      control={form.control}
                      name="preferred_contact_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pref. Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="mobile">Mobile</SelectItem>
                              <SelectItem value="linkedin">LinkedIn</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </FieldGuard>
                </div>

                <div className="flex space-x-6 border-t pt-4">
                  <FieldGuard fieldKey="do_not_call" canEdit={canEdit}>
                    <FormField
                      control={form.control}
                      name="do_not_call"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-y-0 space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Do not call</FormLabel>
                        </FormItem>
                      )}
                    />
                  </FieldGuard>
                  <FieldGuard fieldKey="do_not_email" canEdit={canEdit}>
                    <FormField
                      control={form.control}
                      name="do_not_email"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-y-0 space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Do not email</FormLabel>
                        </FormItem>
                      )}
                    />
                  </FieldGuard>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <FieldGuard fieldKey="linkedin" canEdit={canEdit}>
                    <FormField
                      control={form.control}
                      name="linkedin_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LinkedIn</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </FieldGuard>
                  <FieldGuard fieldKey="twitter" canEdit={canEdit}>
                    <FormField
                      control={form.control}
                      name="twitter_handle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Twitter</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </FieldGuard>
                </div>

              </TabsContent>
            </Tabs>

            <div className="border-t pt-4">
              <LeadCustomFieldInputs
                fields={visibleCustomFields}
                values={customFields}
                onChange={(key, val) =>
                  setCustomFields((prev) => ({ ...prev, [key]: val }))
                }
                canEdit={canEdit}
                canView={canView}
              />
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
