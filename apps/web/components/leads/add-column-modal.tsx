'use client';

import React, { useState } from 'react';

import { Plus, Shield, Users, X } from 'lucide-react';

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
  FieldAccessMember,
} from '~/lib/hooks/use-dynamic-columns';
import { useTeamMembers } from '~/lib/hooks/use-team-members';
import { useModuleRoles } from '~/lib/rbac/rbac-provider';
import { useRBAC } from '~/lib/rbac/rbac-provider';

interface AddColumnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
  /** Product key used to scope roles/users (e.g. 'sales', 'service_cloud'). Defaults to 'sales'. */
  productKey?: string;
  workspaceId: string;
  onSuccess?: (fieldId: string) => void;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'DateTime' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
];

const ACCESS_TYPE_LABELS: Record<AccessType, string> = {
  public: 'Public - Visible to everyone',
  private: 'Private - Only for admins',
  role_based: 'Role Based - Select roles',
  user_based: 'User Based - Select users',
  custom: 'Custom - Roles + Users',
};

export function AddColumnModal({
  open,
  onOpenChange,
  entityType,
  productKey = 'sales',
  workspaceId,
  onSuccess,
}: AddColumnModalProps) {
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [description, setDescription] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [accessType, setAccessType] = useState<AccessType>('public');
  const [members, setMembers] = useState<FieldAccessMember[]>([]);

  const { data: roles = [] } = useModuleRoles(productKey);
  const { data: membersData } = useTeamMembers({ workspaceId, productKey });
  const teamMembers = membersData?.data || [];

  const { currentWorkspace: workspace, user, canAccess } = useRBAC();
  const isOwner = workspace?.owner_id === user?.id;
  const isAdmin =
    isOwner || canAccess('leads', 'admin') || canAccess('leads', 'update');

  // Generate field key from label
  const generateFieldKey = (label: string) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleLabelChange = (label: string) => {
    setFieldLabel(label);
    if (!fieldKey || fieldKey === generateFieldKey(fieldLabel)) {
      setFieldKey(generateFieldKey(label));
    }
  };

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

  const selectedRoleIds = members
    .filter((m) => m.member_type === 'role')
    .map((m) => m.member_id);
  const selectedUserIds = members
    .filter((m) => m.member_type === 'user')
    .map((m) => m.member_id);

  // Ensure non-admins can only have public/private selection
  React.useEffect(() => {
    if (!isAdmin && accessType !== 'public' && accessType !== 'private') {
      setAccessType('public');
    }
  }, [isAdmin, accessType]);

  const handleSubmit = async () => {
    if (!fieldLabel || !fieldKey || !workspaceId) return;

    setIsLoading(true);
    try {
      const payload = {
        workspace_id: workspaceId,
        entity_type: entityType,
        product_key: productKey,
        field_key: fieldKey,
        field_label: fieldLabel,
        field_type: fieldType,
        description: description || undefined,
        is_required: isRequired,
        is_system: false,
        display_order: 0,
        settings: {},
        access_type: accessType,
        access_members:
          accessType === 'public' || accessType === 'private'
            ? undefined
            : members,
        created_by: user?.id,
      };

      const res = await fetch('/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json: unknown = null;
      if (text) {
        try {
          json = JSON.parse(text);
        } catch (parseError) {
          console.error('Failed to parse response body:', text, parseError);
          alert('Error creating field: invalid server response');
          return;
        }
      }

      const jsonObj = json as Record<string, unknown> | null;
      if (!res.ok || jsonObj?.success === false) {
        console.error('API error creating field:', jsonObj || text);
        const msg =
          (jsonObj?.message as string) ||
          (jsonObj?.error as string) ||
          'Failed to create field';
        alert(`Error creating field: ${msg}`);
        return;
      }

      const created = (() => {
        if (!jsonObj || typeof jsonObj !== 'object') {
          return jsonObj;
        }

        const firstData = jsonObj['data'];
        if (typeof firstData === 'undefined') {
          return jsonObj;
        }

        if (firstData && typeof firstData === 'object') {
          const nestedData = (firstData as Record<string, unknown>)['data'];
          return typeof nestedData !== 'undefined' ? nestedData : firstData;
        }

        return firstData;
      })();

      onOpenChange(false);
      onSuccess?.(
        String(
          (created && typeof created === 'object'
            ? (created as Record<string, unknown>)['id']
            : undefined) ?? '',
        ),
      );
    } catch (error: unknown) {
      try {
        const props = Object.getOwnPropertyNames(error as object) as string[];
        console.error(
          'Error creating field:',
          error,
          JSON.stringify(error as object, props),
        );
      } catch {
        console.error('Error creating field (stringify failed):', error);
      }

      alert(
        `Error creating field: ${(error as Error)?.message || String(error)}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const isValid = fieldLabel.trim() && fieldKey.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Column
          </DialogTitle>
          <DialogDescription>
            Create a new custom field for the {entityType} table
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Field Name */}
          <div className="space-y-2">
            <Label htmlFor="fieldLabel">Column Name *</Label>
            <Input
              id="fieldLabel"
              value={fieldLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g., LinkedIn URL"
            />
          </div>

          {/* Field Key (auto-generated but editable) */}
          <div className="space-y-2">
            <Label htmlFor="fieldKey">Field Key *</Label>
            <Input
              id="fieldKey"
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value)}
              placeholder="e.g., linkedin_url"
              className="font-mono text-sm"
            />
            <p className="text-muted-foreground text-xs">
              Unique identifier for this field (lowercase, underscores)
            </p>
          </div>

          {/* Field Type */}
          <div className="space-y-2">
            <Label htmlFor="fieldType">Field Type</Label>
            <Select value={fieldType} onValueChange={setFieldType}>
              <SelectTrigger id="fieldType">
                <SelectValue placeholder="Select field type" />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this field"
            />
          </div>

          {/* Required */}
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="isRequired">Required Field</Label>
            <Switch
              id="isRequired"
              checked={isRequired}
              onCheckedChange={setIsRequired}
            />
          </div>

          {/* Access Type */}
          <div className="space-y-2">
            <Label>Visibility</Label>
            <div className="grid grid-cols-1 gap-2">
              {(isAdmin
                ? (Object.keys(ACCESS_TYPE_LABELS) as AccessType[])
                : (['public', 'private'] as AccessType[])
              ).map((type) => (
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
          {accessType !== 'public' && accessType !== 'private' && (
            <div className="space-y-4 border-t pt-4">
              {/* Role Selection */}
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

                {/* Selected Roles */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {members
                    .filter((m) => m.member_type === 'role')
                    .map((member) => (
                      <div
                        key={member.member_id}
                        className="bg-muted flex items-center gap-2 rounded-md px-2 py-1 text-sm"
                      >
                        <span>{getMemberName('role', member.member_id)}</span>
                        <button
                          type="button"
                          onClick={() => removeMember('role', member.member_id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* User Selection */}
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
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.user?.user_metadata?.full_name ||
                            member.user?.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {/* Selected Users */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {members
                    .filter((m) => m.member_type === 'user')
                    .map((member) => (
                      <div
                        key={member.member_id}
                        className="bg-muted flex items-center gap-2 rounded-md px-2 py-1 text-sm"
                      >
                        <span>{getMemberName('user', member.member_id)}</span>
                        <button
                          type="button"
                          onClick={() => removeMember('user', member.member_id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Member Permissions */}
              {members.length > 0 && (
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
                            <Users className="text-muted-foreground h-4 w-4" />
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
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading ? 'Creating...' : 'Create Column'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for the check icon
function Check({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
