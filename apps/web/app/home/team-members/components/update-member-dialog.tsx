'use client';

import { useEffect, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
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
import {
  type WorkspaceMember,
  updateMemberService,
} from '~/services/team-members.service';
import { CustomInputForView } from '@kit/ui/custom-input-for-view';

interface UpdateMemberDialogProps {
  member: WorkspaceMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  productKey?: string;
}

export function UpdateMemberDialog({
  member,
  open,
  onOpenChange,
  onSuccess,
  productKey,
}: UpdateMemberDialogProps) {
  const { currentWorkspace, canAccess } = useRBAC();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    role_id: member.role_id,
    is_primary_contact: member.is_primary_contact,
  });

  useEffect(() => {
    if (open && member) {
      setFormData({
        role_id: member.role_id,
        is_primary_contact: member.is_primary_contact,
      });
    }
  }, [open, member]);

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['workspaceRoles', currentWorkspace?.id, productKey],
    queryFn: async () => {
      const res = await getRolesService(currentWorkspace?.id || '', productKey);
      return res?.data;
    },
    enabled: open && !!currentWorkspace?.id,
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateMemberService(member.id, {
        role_id: formData.role_id,
        is_primary_contact: formData.is_primary_contact,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspaceMembers', currentWorkspace?.id],
      });
      toast.success('Member updated successfully');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update member');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Update Member</DialogTitle>
          <DialogDescription>
            Update the role and settings for this team member
          </DialogDescription>
        </DialogHeader>

        <form id="dialog-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-2 space-y-2">
          <div className="space-y-2">
            <CustomInputForView
                                label="Email"
                                value={member.user?.email}                    
                              />   
          </div>
            

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={formData.role_id}
              onValueChange={(value) =>
                setFormData({ ...formData, role_id: value })
              }
              disabled={
                rolesLoading ||
                updateMutation.isPending ||
                !canAccess('team_members', 'change_role')
              }
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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

          <div className="flex items-center gap-3">
            <Checkbox
              id="primary_contact"
              checked={formData.is_primary_contact}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  is_primary_contact: checked === true,
                })
              }
              disabled={updateMutation.isPending}
            />
            <Label htmlFor="primary_contact" className="cursor-pointer">
              Mark as primary contact
            </Label>
          </div>

          
        </form>
      <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit" form="dialog-form"
              disabled={updateMutation.isPending}
              className="gap-2"
            >
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
