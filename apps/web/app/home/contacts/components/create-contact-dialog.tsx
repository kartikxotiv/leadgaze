'use client';

import React, { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

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
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Separator } from '@kit/ui/separator';
import { Textarea } from '@kit/ui/textarea';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getAccountsService } from '~/services/accounts.service';
import { createContactService } from '~/services/contacts.service';

import { CreateAccountDialog } from '../../accounts/components/create-account-dialog';

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (contact: any) => void;
  defaultAccountId?: string;
  asFormOnly?: boolean;
}

export function CreateContactDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultAccountId,
  asFormOnly = false,
}: CreateContactDialogProps) {
  const { currentWorkspace: workspace } = useRBAC();
  const queryClient = useQueryClient();

  // New Account Dialog State
  const [createAccountOpen, setCreateAccountOpen] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    job_title: '',
    account_id: defaultAccountId || '',
    notes: '',
  });

  // Update account_id when dialog opens with defaultAccountId
  React.useEffect(() => {
    if (open && defaultAccountId) {
      setFormData((prev) => ({ ...prev, account_id: defaultAccountId }));
    }
  }, [open, defaultAccountId]);

  const { data: accountsData, refetch: refetchAccounts } = useQuery({
    queryKey: ['accounts', workspace?.id],
    queryFn: () => getAccountsService({ workspaceId: workspace!.id }),
    enabled: !!workspace?.id && open,
  });

  const accounts = (accountsData as any)?.data || [];

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      return createContactService({
        ...payload,
        workspaceId: workspace?.id,
      });
    },
    onSuccess: (data) => {
      toast.success('Contact created successfully');
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      resetForm();
      onOpenChange(false);
      if (onSuccess) onSuccess(data);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create contact');
    },
  });

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      job_title: '',
      account_id: '',
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const phoneRegex = /^\+?[0-9]+$/;
    if (formData.phone_number && !phoneRegex.test(formData.phone_number)) {
      toast.error('Phone number can only contain numbers, optionally starting with +');
      return;
    }

    if (!formData.first_name) {
      toast.error('First name is required');
      return;
    }
    mutation.mutate(formData);
  };

  const innerContent = (
    <div className={asFormOnly ? "flex h-full flex-col overflow-auto" : "flex max-h-[90vh] flex-col"}>
      {!asFormOnly && (
        <DialogHeader>
          <DialogTitle>Create New Contact</DialogTitle>
          <DialogDescription>
            Add a new person to your workspace
          </DialogDescription>
        </DialogHeader>
      )}

      <form id="dialog-form" onSubmit={handleSubmit} className={`flex flex-col flex-1 overflow-y-auto px-2 space-y-2 ${asFormOnly && 'mb-2'}`}>
            <div className={`space-y-2 ${asFormOnly && 'pt-2'}`}>
              <h3 className="primary-heading text-leadgaze-dark dark:text-white custom-sub-heading-dialog-form">
                Personal Details
              </h3>              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="first_name">First Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    placeholder="Jane"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="jane.doe@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone_number">Phone</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({ ...formData, phone_number: e.target.value })
                    }
                    placeholder="+1..."
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="primary-heading text-leadgaze-dark dark:text-white custom-sub-heading-dialog-form">
                Professional & Status
              </h3>              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) =>
                      setFormData({ ...formData, job_title: e.target.value })
                    }
                    placeholder="Head of Sales"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-0">
                  <Label htmlFor="account_id">Account</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="text-primary h-auto p-0 text-xs"
                    onClick={() => setCreateAccountOpen(true)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    New Account
                  </Button>
                </div>
                <div className="mb-0">
                <Select
                  value={formData.account_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, account_id: value })
                  }                  
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select associated account" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={4}
                    avoidCollisions={false}
                  >
                    {accounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Add some context about this contact..."
                rows={3}
              />
            </div>

            
          </form>
        <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}                
              >
                Cancel
              </Button>
              <Button type="submit" form="dialog-form" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : !asFormOnly && (
                  <Plus className="h-4 w-4" />
                )}
                Create Contact
              </Button>
            </DialogFooter>
    </div>
  );

  return (
    <>
      {!asFormOnly ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-[650px]">
            {innerContent}
          </DialogContent>
        </Dialog>
      ) : (
        innerContent
      )}

      {/* Nested Account Creation */}
      <CreateAccountDialog
        open={createAccountOpen}
        onOpenChange={setCreateAccountOpen}
        onSuccess={(newAccount) => {
          refetchAccounts();
          setFormData((prev) => ({ ...prev, account_id: newAccount.id }));
        }}
      />
    </>
  );
}
