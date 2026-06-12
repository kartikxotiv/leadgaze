'use client';

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
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

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getRolesService } from '~/services/roles.service';
import { inviteMemberService } from '~/services/team-members.service';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productKey?: string;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  productKey,
}: InviteMemberDialogProps) {
  const { currentWorkspace } = useRBAC();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    email: '',
    role_id: '',
  });

  // Fetch roles for selection
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['workspaceRoles', currentWorkspace?.id],
    queryFn: async () => {
      const res = await getRolesService(currentWorkspace?.id || '');
      return res?.data;
    },
    enabled: open && !!currentWorkspace?.id,
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      inviteMemberService(currentWorkspace?.id || '', {
        email: formData.email,
        role_id: formData.role_id,
        productKey,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspaceMembers', currentWorkspace?.id],
      });
      toast.success('Invitation sent successfully');
      setFormData({ email: '', role_id: '' });
      onOpenChange(false);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to send invitation');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.role_id) {
      toast.error('Email and role are required');
      return;
    }
    inviteMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-[450px]">
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Invite a new member to your workspace and assign them a role
          </DialogDescription>
        </DialogHeader>

        <form id="dialog-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="member@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              disabled={inviteMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Assign Role *</Label>
            <Select
              value={formData.role_id}
              onValueChange={(value) =>
                setFormData({ ...formData, role_id: value })
              }
              disabled={rolesLoading || inviteMutation.isPending}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {roles.map((role: any) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex items-center gap-2">
                      {role.color && (
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                      )}
                      <span>{role.role_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          
        </form>
      <DialogFooter className="border-t p-6 mt-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={inviteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit" form="dialog-form"
              disabled={inviteMutation.isPending}
              className="gap-2"
            >
              {inviteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
