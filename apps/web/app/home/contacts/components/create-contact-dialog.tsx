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
}

export function CreateContactDialog({
  open,
  onOpenChange,
  onSuccess,
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
    account_id: '',
    notes: '',
    is_public: true,
  });

  const { data: accounts = [], refetch: refetchAccounts } = useQuery({
    queryKey: ['accounts', workspace?.id],
    queryFn: () => getAccountsService(workspace?.id || ''),
    enabled: !!workspace?.id && open,
  });

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      return createContactService({
        ...payload,
        workspaceId: workspace?.id,
      });
    },
    onSuccess: (data) => {
      toast.success('Contact created successfully');
      queryClient.invalidateQueries({ queryKey: ['contacts', workspace?.id] });
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
      is_public: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name) {
      toast.error('First name is required');
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Create New Contact</DialogTitle>
            <DialogDescription>
              Add a new person to your workspace.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                Personal Details
              </h3>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
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
                <div className="space-y-2">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
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
                <div className="space-y-2">
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

            <div className="space-y-4 pt-4">
              <h3 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                Professional & Status
              </h3>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
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
                <div className="flex items-center justify-between">
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
                <Select
                  value={formData.account_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, account_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select associated account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-4">
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

            <div className="flex items-start gap-3 pt-4">
              <Checkbox
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => {
                  setFormData((prev) => ({
                    ...prev,
                    is_public: checked as boolean,
                  }));
                }}
                className="mt-1"
              />
              <div className="flex-1">
                <Label
                  htmlFor="is_public"
                  className="cursor-pointer text-sm font-medium"
                >
                  Make this contact public
                </Label>
                <p className="text-muted-foreground mt-1 text-sm">
                  When public, this contact will be visible to all team members
                  with "View contacts" access. When private, only you and
                  assigned team members can see it.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create Contact
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
