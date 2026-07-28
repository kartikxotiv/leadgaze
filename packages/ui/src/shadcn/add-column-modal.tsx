'use client';

import React, { useState } from 'react';

import { Plus, Shield, Users, X } from 'lucide-react';

import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Input } from './input';
import { Label } from './label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Switch } from './switch';
import { cn } from '../lib/utils';

// ─── Generic types (no app-specific imports) ──────────────────────────────────

export type AddColumnAccessType =
  | 'public'
  | 'private'
  | 'role_based'
  | 'user_based'
  | 'custom';

export interface AddColumnAccessMember {
  member_type: 'role' | 'user';
  member_id: string;
  can_view: boolean;
  can_edit: boolean;
}

export interface AddColumnRole {
  id: string;
  role_name?: string | null;
  role_key?: string | null;
}

export interface AddColumnTeamMember {
  user_id: string;
  user?: {
    email?: string | null;
    user_metadata?: { full_name?: string | null } | null;
  } | null;
}

export interface AddColumnPayload {
  field_label: string;
  field_key: string;
  field_type: string;
  description?: string;
  is_required: boolean;
  access_type: AddColumnAccessType;
  access_members?: AddColumnAccessMember[];
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AddColumnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /**
   * The entity type label used in the description (e.g. 'leads', 'contacts').
   */
  entityType: string;

  /**
   * Roles available for role-based / custom access types.
   * Fetched by the consuming page and passed as a prop.
   */
  roles?: AddColumnRole[];

  /**
   * Team members available for user-based / custom access types.
   * Fetched by the consuming page and passed as a prop.
   */
  teamMembers?: AddColumnTeamMember[];

  /**
   * Whether the current user has admin-level permissions.
   * When false, only public/private access types are shown.
   */
  isAdmin?: boolean;

  /**
   * Whether the submit/create operation is in progress.
   * Disables the Create Column button while true.
   */
  isSubmitting?: boolean;

  /**
   * Called when the user submits the form.
   * The consuming page is responsible for calling the actual API.
   */
  onSubmit: (payload: AddColumnPayload) => Promise<void> | void;
}

// ─── Field types ──────────────────────────────────────────────────────────────

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'DateTime' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
];

const ACCESS_TYPE_LABELS: Record<AddColumnAccessType, string> = {
  public: 'Public - Visible to everyone',
  private: 'Private - Only for admins',
  role_based: 'Role Based - Select roles',
  user_based: 'User Based - Select users',
  custom: 'Custom - Roles + Users',
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Generic "Add Column" modal for creating a new custom field.
 *
 * **Fully generic** — all data (roles, teamMembers, isAdmin) is passed as props.
 * The consuming page calls the actual field-creation API via the `onSubmit`
 * callback, so this component works in any module (Leads, Contacts, Accounts,
 * Opportunities, Tickets, Customers, etc.).
 *
 * @example
 *   <AddColumnModal
 *     open={addColumnModalOpen}
 *     onOpenChange={setAddColumnModalOpen}
 *     entityType="leads"
 *     roles={moduleRoles}
 *     teamMembers={teamMembersForModal}
 *     isAdmin={canAddColumn}
 *     isSubmitting={createField.isPending}
 *     onSubmit={async (payload) => {
 *       await fetch('/api/fields', { method: 'POST', body: JSON.stringify({ ...payload, workspace_id, product_key }) });
 *       refetch();
 *     }}
 *   />
 */
export function AddColumnModal({
  open,
  onOpenChange,
  entityType,
  roles = [],
  teamMembers = [],
  isAdmin = false,
  isSubmitting = false,
  onSubmit,
}: AddColumnModalProps) {
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [description, setDescription] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [accessType, setAccessType] = useState<AddColumnAccessType>('public');
  const [members, setMembers] = useState<AddColumnAccessMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-generate field key from label
  const generateFieldKey = (label: string) =>
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const handleLabelChange = (label: string) => {
    setFieldLabel(label);
    if (!fieldKey || fieldKey === generateFieldKey(fieldLabel)) {
      setFieldKey(generateFieldKey(label));
    }
  };

  const resetForm = () => {
    setFieldLabel('');
    setFieldKey('');
    setFieldType('text');
    setDescription('');
    setIsRequired(false);
    setAccessType('public');
    setMembers([]);
  };

  // ── Member helpers ──────────────────────────────────────────────────────────

  const addMember = (type: 'role' | 'user', id: string) => {
    if (members.some((m) => m.member_type === type && m.member_id === id))
      return;
    setMembers([
      ...members,
      { member_type: type, member_id: id, can_view: true, can_edit: false },
    ]);
  };

  const removeMember = (type: 'role' | 'user', id: string) => {
    setMembers(
      members.filter((m) => !(m.member_type === type && m.member_id === id)),
    );
  };

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

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!fieldLabel.trim() || !fieldKey.trim()) return;
    setIsLoading(true);
    try {
      await onSubmit({
        field_label: fieldLabel,
        field_key: fieldKey,
        field_type: fieldType,
        description: description || undefined,
        is_required: isRequired,
        access_type: accessType,
        access_members:
          accessType === 'public' || accessType === 'private'
            ? undefined
            : members,
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = fieldLabel.trim() && fieldKey.trim();
  const isBusy = isLoading || isSubmitting;

  // Access types available based on admin status
  const availableAccessTypes = (
    isAdmin
      ? (Object.keys(ACCESS_TYPE_LABELS) as AddColumnAccessType[])
      : (['public', 'private'] as AddColumnAccessType[])
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Column
          </DialogTitle>
          <DialogDescription>
            Create a new custom field for the {entityType} table
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          {/* Field Name */}
          <div className="space-y-2">
            <Label htmlFor="add-col-label">Column Name *</Label>
            <Input
              id="add-col-label"
              value={fieldLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g., LinkedIn URL"
            />
          </div>

          {/* Field Key */}
          <div className="space-y-2">
            <Label htmlFor="add-col-key">Field Key *</Label>
            <Input
              id="add-col-key"
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
            <Label htmlFor="add-col-type">Field Type</Label>
            <Select value={fieldType} onValueChange={setFieldType}>
              <SelectTrigger id="add-col-type">
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
            <Label htmlFor="add-col-description">Description</Label>
            <Input
              id="add-col-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this field"
            />
          </div>

          {/* Required toggle */}
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="add-col-required">Required Field</Label>
            <Switch
              id="add-col-required"
              checked={isRequired}
              onCheckedChange={setIsRequired}
            />
          </div>

          {/* Access Type */}
          <div className="space-y-2">
            <Label>Visibility</Label>
            <div className="grid grid-cols-1 gap-2">
              {availableAccessTypes.map((type) => (
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
                      <CheckIcon className="text-primary-foreground h-2.5 w-2.5" />
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

          {/* Role/User Selection */}
          {accessType !== 'public' && accessType !== 'private' && (
            <div className="space-y-4 border-t pt-4">
              {/* Roles */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Roles with Access
                </Label>
                <Select onValueChange={(value) => addMember('role', value)} value="">
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

              {/* Users */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users with Access
                </Label>
                <Select onValueChange={(value) => addMember('user', value)} value="">
                  <SelectTrigger>
                    <SelectValue placeholder="Add a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers
                      .filter((m) => !selectedUserIds.includes(m.user_id))
                      .map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.user?.user_metadata?.full_name || member.user?.email}
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

              {/* Per-member permissions */}
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
                            {getMemberName(member.member_type, member.member_id)}
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

        <DialogFooter className="mt-auto flex justify-between border-t p-2">
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isBusy}>
            {isBusy ? 'Creating...' : 'Create Column'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

AddColumnModal.displayName = 'AddColumnModal';

// ─── Inline SVG check icon (avoids importing lucide Check which conflicts) ─────
function CheckIcon({ className }: { className?: string }) {
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
