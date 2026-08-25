'use client';

import React, { useState } from 'react';

import { Plus, Shield, Users, X, Search, ChevronDown } from 'lucide-react';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
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
   * Optional for tables that only toggle existing columns and don't add new ones.
   */
  entityType?: string;

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
   * If omitted, the 'Create New' tab will not be shown.
   */
  onSubmit?: (payload: AddColumnPayload) => Promise<void> | void;

  /** The list of columns for the 'Add Existing' tab */
  columns?: { id: string; label: string; required?: boolean }[];
  
  /** Visibility state for the columns */
  visibility?: Record<string, boolean>;
  
  /** Callback when a column's visibility is toggled */
  onToggleColumn?: (columnId: string) => void;
  
  /** Callback to reset column visibility */
  onResetColumns?: () => void;
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
  columns = [],
  visibility = {},
  onToggleColumn,
  onResetColumns,
}: AddColumnModalProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'existing'>('existing');
  
  const hasExisting = columns && columns.length > 0;
  const hasCreate = !!onSubmit;
  const currentTab = activeTab === 'existing' && !hasExisting ? 'create' : activeTab === 'create' && !hasCreate ? 'existing' : activeTab;
  
  const [columnSearch, setColumnSearch] = useState('');
  
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
      await onSubmit?.({
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

  const filteredColumns = columns.filter(c => c.label.toLowerCase().includes(columnSearch.toLowerCase()));
  const shownColumnsCount = columns.filter(c => visibility[c.id] !== false).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-lg gap-0">
        <DialogHeader>
          <DialogTitle>Toggle Columns</DialogTitle>          
        </DialogHeader>
        <div className='flex flex-col flex-1 gap-2 custom-spacing-x-y'>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search Columns..."
              value={columnSearch}
              onChange={(e) => setColumnSearch(e.target.value)}
              className="pl-9 w-full"
            />
          </div>

          {hasCreate && hasExisting ? (
            <Tabs value={currentTab} onValueChange={(v) => setActiveTab(v as 'create' | 'existing')} className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                <TabsTrigger
                  value="create"
                  className="relative h-8 rounded-none border-b-2 border-b-transparent bg-transparent px-4 secondary-text-small-bold shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  Create New
                </TabsTrigger>
                <TabsTrigger
                  value="existing"
                  className="relative h-8 rounded-none border-b-2 border-b-transparent bg-transparent px-4 secondary-text-small-bold shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  Add Existing
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            <div className="h-0" />
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {currentTab === 'existing' ? (
            <div className="custom-spacing-x-y pt-0 space-y-1 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
                <div className="flex items-center gap-1 text-[10px]">
                  SHOWN <ChevronDown className="h-3 w-3" />
                </div>
                <span>{shownColumnsCount}</span>
              </div>
              <div>
                {filteredColumns.map(column => {
                  const isLocked = ['S. No.', 'Name'].includes(column.label) || ['s_no', 'name'].includes(column.id);
                  return (
                    <div key={column.id} className="flex items-center justify-between py-2">
                      <span className={cn("primary-text-medium", isLocked ? "text-leadgaze-muted" : "text-leadgaze-dark dark:text-white")}>
                        {column.label}
                      </span>
                      <Switch className="h-5"
                        checked={visibility[column.id] !== false || isLocked}
                        onCheckedChange={() => !isLocked && onToggleColumn?.(column.id)}
                        disabled={isLocked}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden flex-1">
              <div className="custom-spacing-x-y flex-1 overflow-y-auto pt-0 flex flex-col gap-2">
          {/* Field Name */}
          <div>
            <Label htmlFor="add-col-label">Column Name <span className="text-red-500">*</span></Label>
            <Input
              id="add-col-label"
              value={fieldLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g., LinkedIn URL"
            />
          </div>

          {/* Field Key */}
          <div>
            <Label htmlFor="add-col-key">Field Key <span className="text-red-500">*</span></Label>
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
          <div>
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
          <div>
            <Label htmlFor="add-col-description">Description</Label>
            <Input
              id="add-col-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this field"
            />
          </div>

          {/* Required toggle */}
          <div className="flex items-center justify-between pb-2">
            <Label htmlFor="add-col-required">
              <span className="text-[14px]">Required Field</span>
            </Label>
            <Switch
              id="add-col-required"
              checked={isRequired}
              onCheckedChange={setIsRequired}
              className="h-5"
            />
          </div>

          {/* Access Type */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground tracking-wider">Permission Schema</Label>
            <div className="flex flex-col">
              {availableAccessTypes.map((type, index) => (
                <Button
                  key={type}
                  type="button"
                  onClick={() => setAccessType(type)}                  
                  className={cn(
                    'flex items-center gap-3 py-3 text-left transition-colors bg-card hover:bg-muted h-8 justify-start px-0',
                    index !== availableAccessTypes.length - 1 && 'border-b'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border',
                      accessType === type
                        ? 'border-primary'
                        : 'border-input'
                    )}
                  >
                    {accessType === type && (
                      <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="primary-text-regular text-foreground">
                    {ACCESS_TYPE_LABELS[type]}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Role/User Selection */}
          {accessType !== 'public' && accessType !== 'private' && (
            <div className="space-y-2 border-t pt-4">
              {/* Roles */}
              <div className="space-y-1">
                <Label className="!flex items-center gap-2">
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
              <div className="space-y-1">
                <Label className="!flex items-center gap-2">
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
                          <span className="text-sm text-leadgaze-dark dark:text-white">
                            {getMemberName(member.member_type, member.member_id)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <Label className="!flex cursor-pointer items-center gap-2 text-sm justify-center">
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
                          </Label>
                          <Label className="!flex cursor-pointer items-center gap-2 text-sm justify-center">
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
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!isValid || isBusy}>
                  {isBusy ? 'Creating...' : 'Create Column'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
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
