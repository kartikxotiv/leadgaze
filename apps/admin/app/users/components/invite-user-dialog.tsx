'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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

import { getAdminRolesService, inviteAdminUserService } from '~/services/admin-roles.service';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');

  // Fetch roles for the select dropdown
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: getAdminRolesService,
    enabled: open,
  });

  const inviteMutation = useMutation({
    mutationFn: inviteAdminUserService,
    onSuccess: () => {
      toast.success('Admin user invited successfully. They will receive an email shortly.');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onOpenChange(false);
      // Reset form
      setName('');
      setEmail('');
      setRoleId('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to invite user');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !roleId) {
      toast.error('Please fill in all fields');
      return;
    }
    inviteMutation.mutate({ name, email, role_id: roleId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Admin User</DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new user to the Admin Panel. They will be prompted to set their password.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              placeholder="e.g. Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={inviteMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g. jane@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={inviteMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Admin Role <span className="text-destructive">*</span></Label>
            <Select
              value={roleId}
              onValueChange={setRoleId}
              disabled={isLoadingRoles || inviteMutation.isPending}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder={isLoadingRoles ? "Loading roles..." : "Select a role"} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={inviteMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inviting...
                </>
              ) : (
                'Send Invite'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
