'use client';

import React, { useEffect, useState } from 'react';

import { Check, Shield, Trash2, User, Users, X } from 'lucide-react';

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
import { Switch } from '@kit/ui/switch';
import { cn } from '@kit/ui/utils';

import type {
  AccessType,
  EntityField,
  FieldAccessMember,
} from '~/lib/hooks/use-dynamic-columns';
import {
  useDeleteField,
  useUpdateFieldAccess,
} from '~/lib/hooks/use-dynamic-columns';
import { useTeamMembers } from '~/lib/hooks/use-team-members';
import { useModuleRoles } from '~/lib/rbac/rbac-provider';

interface ColumnEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: EntityField;
  /** Product key used to scope roles/users (e.g. 'sales', 'service_cloud'). */
  productKey?: string;
  onSave: (
    updates: { field_label?: string },
    accessType: AccessType,
    members: FieldAccessMember[],
  ) => void;
  onDelete?: (fieldId: string) => void;
}

const ACCESS_TYPE_LABELS: Record<AccessType, string> = {
  public: 'Public - Visible to everyone',
  private: 'Private - Only for admins',
  role_based: 'Role Based - Select roles',
  user_based: 'User Based - Select users',
  custom: 'Custom - Roles + Users',
};

export function ColumnEditModal({
  open,
  onOpenChange,
  field,
  productKey = 'sales',
  onSave,
  onDelete,
}: ColumnEditModalProps) {
  const [fieldLabel, setFieldLabel] = useState(field.field_label);
  const [accessType, setAccessType] = useState<AccessType>(
    field.access_rule?.access_type || 'public',
  );
  const [members, setMembers] = useState<FieldAccessMember[]>(
    field.access_members || [],
  );

  const { data: roles = [] } = useModuleRoles(productKey);
  const { data: membersData } = useTeamMembers({
    workspaceId: field.workspace_id,
    productKey,
  });
  const teamMembers = membersData?.data || [];

  const updateFieldAccess = useUpdateFieldAccess();
  const deleteField = useDeleteField();

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setFieldLabel(field.field_label);
      setAccessType(field.access_rule?.access_type || 'public');
      setMembers(field.access_members || []);
    }
  }, [open, field]);

  // Add a member
  const addMember = (type: 'role' | 'user', id: string) => {
    if (members.some((m) => m.member_type === type && m.member_id === id))
      return;
    setMembers([
      ...members,
      { member_type: type, member_id: id, can_view: true, can_edit: false },
    ]);
  };

  // Remove a member
  const removeMember = (type: 'role' | 'user', id: string) => {
    setMembers(
      members.filter((m) => !(m.member_type === type && m.member_id === id)),
    );
  };

  // Toggle member permission
  const toggleMemberPermission = (
    type: 'role' | 'user',
    id: string,
    permission: 'can_view' | 'can_edit',
  ) => {
    setMembers(
      members.map((m) => {
        if (m.member_type === type && m.member_id === id) {
          return { ...m, [permission]: !m[permission] };
        }
        return m;
      }),
    );
  };

  // Get member name by ID
  const getMemberName = (type: 'role' | 'user', id: string) => {
    if (type === 'role') {
      const role = roles.find((r) => r.id === id);
      return role?.role_name || role?.role_key || 'Unknown Role';
    }
    const member = teamMembers.find((m) => m.user_id === id);
    return (
      member?.user?.user_metadata?.full_name ||
      member?.user?.email ||
      'Unknown User'
    );
  };

  // Get selected role IDs
  const selectedRoleIds = members
    .filter((m) => m.member_type === 'role')
    .map((m) => m.member_id);
  const selectedUserIds = members
    .filter((m) => m.member_type === 'user')
    .map((m) => m.member_id);
  const showRoleSelection = accessType !== 'user_based';
  const showUserSelection = accessType !== 'role_based';

  // Handle save
  const handleSave = () => {
    const memberPayload =
      accessType === 'public' || accessType === 'private' ? [] : members;

    onSave({ field_label: fieldLabel }, accessType, memberPayload);
  };

  // Handle delete
  const handleDelete = async () => {
    if (onDelete) {
      await deleteField.mutateAsync({ fieldId: field.id });
      onDelete(field.id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Column: {field.field_label}</DialogTitle>
          <DialogDescription>
            Configure visibility and permissions for this field
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Field Label */}
          <div className="space-y-2">
            <Label htmlFor="fieldLabel">Column Name</Label>
            <Input
              id="fieldLabel"
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
              placeholder="Enter column name"
            />
          </div>

          {/* Access Type */}
          <div className="space-y-2">
            <Label>Visibility</Label>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(ACCESS_TYPE_LABELS) as AccessType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAccessType(type)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
                    accessType === type
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full border-2',
                      accessType === type
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground',
                    )}
                  >
                    {accessType === type && (
                      <Check className="text-primary-foreground h-2.5 w-2.5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {ACCESS_TYPE_LABELS[type]}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Role/User Selection for non-public access */}
          {accessType !== 'public' && (
            <div className="space-y-4 border-t pt-4">
              {accessType !== 'private' && (
                <>
                  {showRoleSelection && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Roles with Access
                      </Label>
                      <Select
                        onValueChange={(value) => addMember('role', value)}
                        value=""
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Add a role..." />
                        </SelectTrigger>
                        <SelectContent>
                          {roles
                            .filter((r) => !selectedRoleIds.includes(r.id))
                            .map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.role_name || role.role_key}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {members
                          .filter((m) => m.member_type === 'role')
                          .map((member) => (
                            <div
                              key={member.member_id}
                              className="bg-muted flex items-center gap-2 rounded-md px-2 py-1 text-sm"
                            >
                              <span>
                                {getMemberName('role', member.member_id)}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  removeMember('role', member.member_id)
                                }
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {showUserSelection && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Users with Access
                      </Label>
                      <Select
                        onValueChange={(value) => addMember('user', value)}
                        value=""
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Add a user..." />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers
                            .filter((m) => !selectedUserIds.includes(m.user_id))
                            .map((member) => (
                              <SelectItem
                                key={member.user_id}
                                value={member.user_id}
                              >
                                {member.user?.user_metadata?.full_name ||
                                  member.user?.email}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {members
                          .filter((m) => m.member_type === 'user')
                          .map((member) => (
                            <div
                              key={member.member_id}
                              className="bg-muted flex items-center gap-2 rounded-md px-2 py-1 text-sm"
                            >
                              <span>
                                {getMemberName('user', member.member_id)}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  removeMember('user', member.member_id)
                                }
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Member Permissions */}
              {members.length > 0 && accessType !== 'private' && (
                <div className="space-y-2 border-t pt-4">
                  <Label>Permissions</Label>
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={`${member.member_type}-${member.member_id}`}
                        className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          {member.member_type === 'role' ? (
                            <Shield className="text-muted-foreground h-4 w-4" />
                          ) : (
                            <User className="text-muted-foreground h-4 w-4" />
                          )}
                          <span className="text-sm font-medium">
                            {getMemberName(
                              member.member_type,
                              member.member_id,
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <Switch
                              checked={member.can_view}
                              onCheckedChange={() =>
                                toggleMemberPermission(
                                  member.member_type,
                                  member.member_id,
                                  'can_view',
                                )
                              }
                            />
                            <span>View</span>
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <Switch
                              checked={member.can_edit}
                              onCheckedChange={() =>
                                toggleMemberPermission(
                                  member.member_type,
                                  member.member_id,
                                  'can_edit',
                                )
                              }
                            />
                            <span>Edit</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delete Button for Custom Fields */}
          {!field.is_system && onDelete && (
            <div className="border-t pt-4">
              <Button
                variant="destructive"
                size="sm"
                className="flex items-center gap-2"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
                Delete Column
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateFieldAccess.isPending}>
            {updateFieldAccess.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
