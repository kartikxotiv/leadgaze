'use client';

import React, { useEffect, useState } from 'react';

import { Check, Shield, Trash2, User, Users, X } from 'lucide-react';

import { Button } from './button';
import { CustomDeleteDialog } from './custom-delete-dialog';
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
import { Checkbox } from './checkbox';
import { cn } from '../lib/utils';

// ─── Generic types (no app-specific imports) ──────────────────────────────────

export type ColumnEditAccessType =
  | 'public'
  | 'private'
  | 'role_based'
  | 'user_based'
  | 'custom';

export interface ColumnEditAccessMember {
  member_type: 'role' | 'user';
  member_id: string;
  can_view: boolean;
  can_edit: boolean;
}

export interface ColumnEditFieldShape {
  id: string;
  field_key: string;
  field_label: string;
  workspace_id: string;
  is_system?: boolean;
  access_rule?: { access_type?: ColumnEditAccessType } | null;
  access_members?: ColumnEditAccessMember[];
}

export interface ColumnEditRole {
  id: string;
  role_name?: string | null;
  role_key?: string | null;
}

export interface ColumnEditTeamMember {
  user_id: string;
  user?: {
    email?: string | null;
    user_metadata?: { full_name?: string | null } | null;
  } | null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ColumnEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** The field being edited. */
  field: ColumnEditFieldShape;

  /**
   * Roles available for role-based / custom access types.
   * Fetched by the consuming page and passed in as a prop.
   */
  roles?: ColumnEditRole[];

  /**
   * Team members available for user-based / custom access types.
   * Fetched by the consuming page and passed in as a prop.
   */
  teamMembers?: ColumnEditTeamMember[];

  /** Whether the save mutation is in progress (disables save button). */
  isSaving?: boolean;

  /**
   * Called when the user clicks Save.
   * The consuming page is responsible for calling the actual mutation.
   */
  onSave: (
    updates: { field_label?: string },
    accessType: ColumnEditAccessType,
    members: ColumnEditAccessMember[],
  ) => void;

  /**
   * When provided, a "Delete Column" button is shown for non-system fields.
   * The consuming page handles the actual delete mutation.
   */
  onDelete?: (fieldId: string) => void;

  /** Whether the current user is an admin. If false, permissions are restricted. */
  isAdmin?: boolean;
}

// ─── Access type labels ───────────────────────────────────────────────────────

const ACCESS_TYPE_LABELS: Record<ColumnEditAccessType, string> = {
  public: 'Public - Visible to everyone',
  private: 'Private - Only for admins',
  role_based: 'Role Based - Select roles',
  user_based: 'User Based - Select users',
  custom: 'Custom - Roles + Users',
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Generic column edit modal for configuring field-level security (FLS).
 *
 * **Fully generic** — all data (roles, teamMembers) is passed as props.
 * The consuming page is responsible for fetching and passing in the required
 * data, and for handling the save / delete mutations.
 *
 * Used on any entity page (Leads, Tickets, Customers, etc.) that supports
 * column-level access control.
 *
 * @example
 *   <ColumnEditModal
 *     open={!!editingField}
 *     onOpenChange={(v) => !v && setEditingField(null)}
 *     field={editingField}
 *     roles={roles}
 *     teamMembers={teamMembers}
 *     isSaving={isSaving}
 *     onSave={handleUpdateField}
 *     onDelete={handleDeleteField}
 *   />
 */
export function ColumnEditModal({
  open,
  onOpenChange,
  field,
  roles = [],
  teamMembers = [],
  isSaving = false,
  onSave,
  onDelete,
  isAdmin = false,
}: ColumnEditModalProps) {
  const [fieldLabel, setFieldLabel] = useState(field.field_label);
  const [accessType, setAccessType] = useState<ColumnEditAccessType>(
    field.access_rule?.access_type || 'public',
  );
  const [members, setMembers] = useState<ColumnEditAccessMember[]>(
    field.access_members || [],
  );

  // Reset state whenever the modal opens for a new field
  useEffect(() => {
    if (open) {
      setFieldLabel(field.field_label);
      setAccessType(field.access_rule?.access_type || 'public');
      setMembers(field.access_members || []);
    }
  }, [open, field]);

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
          const updated = { ...m, [permission]: !m[permission] };
          // If both view and edit are disabled, remove the member entirely
          if (!updated.can_view && !updated.can_edit) {
            return null as unknown as ColumnEditAccessMember;
          }
          return updated;
        }
        return m;
      }).filter((m): m is ColumnEditAccessMember => m !== null),
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

  const showRoleSelection = accessType !== 'user_based';
  const showUserSelection = accessType !== 'role_based';

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSave = () => {
    const memberPayload =
      accessType === 'public' || accessType === 'private' ? [] : members;
    onSave({ field_label: fieldLabel }, accessType, memberPayload);
  };

  const handleDeleteClick = () => {
    setIsConfirmDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete?.(field.id);
      setIsConfirmDeleteDialogOpen(false);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to delete column:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
          {/* Left Pane (Settings) */}
          <div className="md:col-span-5 bg-slate-50/70 p-6 border-r border-slate-200 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2D45D8] text-white">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 3v18" />
                    <path d="M3 9h18" />
                  </svg>
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">Edit Column</DialogTitle>
                  <p className="text-xs text-muted-foreground">General settings and identity</p>
                </div>
              </div>

              {/* Column Name */}
              <div>
                <Label htmlFor="col-edit-label" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Column Name</Label>
                <Input
                  id="col-edit-label"
                  value={fieldLabel}
                  disabled={!isAdmin}
                  onChange={(e) => setFieldLabel(e.target.value)}
                  placeholder="Enter column name"                  
                />
              </div>

              {/* Visibility Level */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visibility Level</Label>
                <div className="space-y-2">
                  {(Object.keys(ACCESS_TYPE_LABELS) as ColumnEditAccessType[])
                    .filter((type) => {
                      if (!isAdmin && type !== 'public' && type !== 'private') {
                        return false;
                      }
                      return true;
                    })
                    .map((type) => {
                      const isDisabled = !isAdmin && field.is_system;
                      const isSelected = accessType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => setAccessType(type)}
                          className={cn(
                            'w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors bg-white',
                            isSelected
                              ? 'border-[#2D45D8] bg-[#2D45D8]/5 ring-1 ring-[#2D45D8]'
                              : 'border-slate-200 hover:bg-slate-50',
                            isDisabled && 'cursor-not-allowed opacity-50'
                          )}
                        >
                          <Checkbox
                            isRadio
                            checked={isSelected}
                            className={cn(
                              'mt-0.5 pointer-events-none',
                              isSelected && 'border-[#2D45D8]'
                            )}
                          />
                          <div className="flex-1 space-y-0.5">
                            <div className={cn(
                              "leadgaze-dark dark:text-white text-xs font-bold leading-none",
                              isSelected ? 'text-[#2D45D8]' : 'text-foreground'
                            )}>
                              {type === 'public' && 'Public'}
                              {type === 'private' && 'Private'}
                              {type === 'role_based' && 'Role Based'}
                              {type === 'user_based' && 'User Based'}
                              {type === 'custom' && 'Custom'}
                            </div>
                            <div className="text-[11px] text-muted-foreground leading-normal mt-1">
                              {type === 'public' && 'Visible to all workspace members'}
                              {type === 'private' && 'Only workspace admins can view'}
                              {type === 'role_based' && 'Select specific roles for access'}
                              {type === 'user_based' && 'Select specific users for access'}
                              {type === 'custom' && 'Combination of roles and users'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Delete Option */}
            {!field.is_system && onDelete && (
              <div className="pt-4 flex justify-start">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1.5 h-8 text-xs px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Column
                </Button>
              </div>
            )}
          </div>

          {/* Right Pane (Access Control & Permissions) */}
          <div className="md:col-span-7 p-0 flex flex-col justify-between bg-white">
            <div className="space-y-6 p-2">
              {accessType !== 'public' && accessType !== 'private' ? (
                <>
                  {/* Access Control Box */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Access Control</Label>
                    </div>

                    <Select
                      value=""
                      onValueChange={(val) => {
                        if (!val) return;
                        const [type, id] = val.split(':');
                        if ((type === 'role' || type === 'user') && id) {
                          addMember(type, id);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full h-auto p-3 text-left border border-slate-200 rounded-lg bg-white flex items-center justify-between hover:bg-white focus:ring-1 focus:ring-[#2D45D8]">
                        {members.length === 0 ? (
                          <span className="text-xs text-muted-foreground flex-1">Search roles or members...</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 items-center flex-1 pr-2">
                            {members.map((member) => (
                              <div
                                key={member.member_id}
                                className="bg-[#2D45D8] text-white flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()} 
                              >
                                {member.member_type === 'role' ? (
                                  <Shield className="h-3 w-3 shrink-0" />
                                ) : (
                                  <Users className="h-3 w-3 shrink-0" />
                                )}
                                <span>{getMemberName(member.member_type, member.member_id)}</span>
                                <button
                                  type="button"
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    removeMember(member.member_type, member.member_id);
                                  }}
                                  className="text-white/80 hover:text-white shrink-0 p-0.5 rounded-full hover:bg-white/20 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            <div className="text-xs text-muted-foreground min-w-[80px] ml-1">Search...</div>
                          </div>
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {showRoleSelection && roles.filter((r) => !selectedRoleIds.includes(r.id)).length > 0 && (
                          <>
                            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Roles</div>
                            {roles
                              .filter((r) => !selectedRoleIds.includes(r.id))
                              .map((role) => (
                                <SelectItem key={`role:${role.id}`} value={`role:${role.id}`}>
                                  {role.role_name || role.role_key}
                                </SelectItem>
                              ))}
                          </>
                        )}
                        {showUserSelection && teamMembers.filter((m) => !selectedUserIds.includes(m.user_id)).length > 0 && (
                          <>
                            {showRoleSelection && roles.filter((r) => !selectedRoleIds.includes(r.id)).length > 0 && (
                              <div className="h-px bg-border my-1" />
                            )}
                            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Users</div>
                            {teamMembers
                              .filter((m) => !selectedUserIds.includes(m.user_id))
                              .map((member) => (
                                <SelectItem key={`user:${member.user_id}`} value={`user:${member.user_id}`}>
                                  {member.user?.user_metadata?.full_name || member.user?.email}
                                </SelectItem>
                              ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Permission Detail */}
                  <div className="space-y-2 flex-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Permission Detail</Label>
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50">
                            <th className="p-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Role / Member</th>
                            <th className="p-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center w-20">View</th>
                            <th className="p-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center w-20">Edit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="p-6 text-center text-xs text-muted-foreground">
                                No roles or members selected. Grant access above.
                              </td>
                            </tr>
                          ) : (
                            members.map((member) => {
                              const name = getMemberName(member.member_type, member.member_id);
                              const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                              return (
                                <tr key={`${member.member_type}-${member.member_id}`} className="border-b border-slate-200 last:border-0 hover:bg-slate-50/30 transition-colors">
                                  <td className="p-3 flex items-center gap-3">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E0E7FF] text-leadgaze-dark text-[11px] font-bold dark:text-white">
                                      {initials}
                                    </div>
                                    <span className="text-xs font-semibold text-foreground">{name}</span>
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="flex justify-center">
                                      <Checkbox
                                        checked={member.can_view}
                                        onCheckedChange={() =>
                                          toggleMemberPermission(
                                            member.member_type,
                                            member.member_id,
                                            'can_view',
                                          )
                                        }
                                      />
                                    </div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="flex justify-center">
                                      <Checkbox
                                        checked={member.can_edit}
                                        onCheckedChange={() =>
                                          toggleMemberPermission(
                                            member.member_type,
                                            member.member_id,
                                            'can_edit',
                                          )
                                        }
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 space-y-2">
                  <div className="h-16 w-16 rounded-full bg-emerald-50/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Check className="h-8 w-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-sm text-foreground custom-sub-heading-dialog-form">
                      {accessType === 'public' ? 'Public Column Visibility' : 'Private Column Visibility'}
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-[280px] leading-normal">
                      {accessType === 'public'
                        ? 'This column is visible to all workspace members. No individual role or member permissions are required.'
                        : 'This column is private and only accessible to workspace administrators.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="mt-2 border-t border-slate-200 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="text-primary-foreground text-xs">
                Save Changes
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
      <CustomDeleteDialog
        isOpen={isConfirmDeleteDialogOpen}
        onOpenChange={setIsConfirmDeleteDialogOpen}
        title="Delete Column"
        description={`Are you sure you want to delete the column "${field.field_label}"? This action cannot be undone and any data stored in this column will be permanently removed.`}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </Dialog>
  );
}

ColumnEditModal.displayName = 'ColumnEditModal';
