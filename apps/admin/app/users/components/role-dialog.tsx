'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, ChevronDown } from 'lucide-react';

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
import { Checkbox } from '@kit/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@kit/ui/collapsible';

import {
  AdminRole,
  AdminPermission,
  createAdminRoleService,
  getAdminPermissionsService,
  getRolePermissionsService,
  updateRolePermissionsService,
} from '~/services/admin-roles.service';

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: AdminRole | null;
}

export function RoleDialog({ open, onOpenChange, role }: RoleDialogProps) {
  const queryClient = useQueryClient();
  const isEditMode = !!role;

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  // permissionsState: { [permissionId]: { can_view: boolean, can_create: boolean, ... } }
  const [permissionsState, setPermissionsState] = useState<Record<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>>({});
  
  // Track expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const { data: permissions, isLoading: modulesLoading } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: getAdminPermissionsService,
    enabled: open,
  });

  const { data: rolePermissions } = useQuery({
    queryKey: ['admin-role-permissions', role?.id],
    queryFn: () => getRolePermissionsService(role!.id),
    enabled: open && !!role,
  });

  // Initialize form state when opened
  useEffect(() => {
    if (open) {
      if (role) {
        setName(role.name);
        setSlug(role.slug);
        setDescription(role.description || '');
      } else {
        setName('');
        setSlug('');
        setDescription('');
      }
    }
  }, [open, role]);

  // Initialize permissions state
  useEffect(() => {
    if (open && permissions && permissions.length > 0) {
      const state: any = {};
      const currentRolePerms = rolePermissions || [];
      
      permissions.forEach(p => {
        const existing = currentRolePerms.find(rp => rp.permission_id === p.id);
        state[p.id] = {
          can_view: existing?.can_view || false,
          can_create: existing?.can_create || false,
          can_edit: existing?.can_edit || false,
          can_delete: existing?.can_delete || false,
        };
      });
      
      setPermissionsState(prev => {
        if (JSON.stringify(prev) === JSON.stringify(state)) return prev;
        return state;
      });
      
      // Auto-expand all categories by default
      const categories = Array.from(new Set(permissions.map(p => p.category)));
      const expanded: Record<string, boolean> = {};
      categories.forEach(c => expanded[c] = true);
      
      setExpandedCategories(prev => {
        if (JSON.stringify(prev) === JSON.stringify(expanded)) return prev;
        return expanded;
      });
    }
  }, [permissions, rolePermissions, open]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) {
      toast.error('Role Name and Key are required');
      return;
    }

    setIsSubmitting(true);
    try {
      let roleId = role?.id;
      
      if (!isEditMode) {
        const newRole = await createAdminRoleService({ name, slug, description });
        roleId = newRole.data.id;
      }

      if (roleId) {
        const payload = Object.entries(permissionsState).map(([permId, actions]) => ({
          permission_id: permId,
          ...actions,
        }));
        await updateRolePermissionsService({ roleId, permissions: payload });
      }

      toast.success(isEditMode ? 'Role permissions updated' : 'Role created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActionToggle = (permId: string, action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete') => {
    setPermissionsState(prev => ({
      ...prev,
      [permId]: {
        ...prev[permId],
        [action]: !prev[permId]?.[action],
      },
    }));
  };

  const toggleCategoryPermissions = (category: string, perms: AdminPermission[]) => {
    const isAllChecked = perms.every(p => 
      permissionsState[p.id]?.can_view &&
      permissionsState[p.id]?.can_create &&
      permissionsState[p.id]?.can_edit &&
      permissionsState[p.id]?.can_delete
    );

    setPermissionsState(prev => {
      const next = { ...prev };
      perms.forEach(p => {
        next[p.id] = {
          can_view: !isAllChecked,
          can_create: !isAllChecked,
          can_edit: !isAllChecked,
          can_delete: !isAllChecked,
        };
      });
      return next;
    });
  };

  // Group permissions by category
  const permissionsByCategory = (permissions || []).reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, AdminPermission[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 flex h-fit flex-col gap-0 overflow-hidden p-0 sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>New Role</DialogTitle>
          <DialogDescription>
            Create a new role and assign permissions to it
          </DialogDescription>
        </DialogHeader>

        <form id="role-form" onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-2">
              
              {/* Role Details Section */}
              <div className="space-y-2">
                <h3 className="primary-heading text-leadgaze-dark dark:text-white custom-sub-heading-dialog-form">
                  Role Details
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="role-name">Role Name *</Label>
                  <Input
                    id="role-name"
                    placeholder="e.g., Senior Manager"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!isEditMode) {
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)+/g, ''));
                      }
                    }}
                    disabled={isEditMode || isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role-slug">Role Key *</Label>
                  <Input
                    id="role-slug"
                    placeholder="e.g., senior_manager"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    disabled={isEditMode || isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role-desc">Description</Label>
                  <Input
                    id="role-desc"
                    placeholder="Describe this role's purpose"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Permissions Section */}
              <div className="space-y-2">
                <h3 className="primary-heading text-leadgaze-dark dark:text-white custom-sub-heading-dialog-form">
                  Permissions
                </h3>
                
                {modulesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : permissions && permissions.length > 0 ? (
                  <div className="space-y-2 rounded-lg border p-3">
                    <div className="space-y-2">
                      {Object.entries(permissionsByCategory).map(([category, perms]) => {
                        const isAllChecked = perms.every(p => 
                          permissionsState[p.id]?.can_view &&
                          permissionsState[p.id]?.can_create &&
                          permissionsState[p.id]?.can_edit &&
                          permissionsState[p.id]?.can_delete
                        );

                        return (
                          <Collapsible
                            key={category}
                            open={expandedCategories[category] || false}
                            onOpenChange={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                          >
                            <div className="flex items-center gap-2">
                              <CollapsibleTrigger className="flex items-center gap-2">
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform ${
                                    expandedCategories[category] ? '' : '-rotate-90'
                                  }`}
                                />
                              </CollapsibleTrigger>
                              <Checkbox
                                checked={isAllChecked}
                                onCheckedChange={() => toggleCategoryPermissions(category, perms)}
                              />
                              <label className="flex-1 cursor-pointer capitalize">
                                {category}
                              </label>
                            </div>

                            <CollapsibleContent className="space-y-2 pt-2 pl-8">
                              {perms.map(p => (
                                <React.Fragment key={p.id}>
                                  <div className="flex items-center gap-2">
                                    <Checkbox 
                                      id={`${p.id}-view`}
                                      checked={permissionsState[p.id]?.can_view || false}
                                      onCheckedChange={() => handleActionToggle(p.id, 'can_view')}
                                    />
                                    <label htmlFor={`${p.id}-view`} className="flex-1 cursor-pointer text-sm">
                                      <span className="font-medium">View {p.name}</span>
                                      <span className="ml-2 text-xs text-slate-500">(view)</span>
                                    </label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Checkbox 
                                      id={`${p.id}-create`}
                                      checked={permissionsState[p.id]?.can_create || false}
                                      onCheckedChange={() => handleActionToggle(p.id, 'can_create')}
                                    />
                                    <label htmlFor={`${p.id}-create`} className="flex-1 cursor-pointer text-sm">
                                      <span className="font-medium">Create {p.name}</span>
                                      <span className="ml-2 text-xs text-slate-500">(create)</span>
                                    </label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Checkbox 
                                      id={`${p.id}-edit`}
                                      checked={permissionsState[p.id]?.can_edit || false}
                                      onCheckedChange={() => handleActionToggle(p.id, 'can_edit')}
                                    />
                                    <label htmlFor={`${p.id}-edit`} className="flex-1 cursor-pointer text-sm">
                                      <span className="font-medium">Edit {p.name}</span>
                                      <span className="ml-2 text-xs text-slate-500">(edit)</span>
                                    </label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Checkbox 
                                      id={`${p.id}-delete`}
                                      checked={permissionsState[p.id]?.can_delete || false}
                                      onCheckedChange={() => handleActionToggle(p.id, 'can_delete')}
                                    />
                                    <label htmlFor={`${p.id}-delete`} className="flex-1 cursor-pointer text-sm">
                                      <span className="font-medium">Delete {p.name}</span>
                                      <span className="ml-2 text-xs text-slate-500">(delete)</span>
                                    </label>
                                  </div>
                                </React.Fragment>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No permissions available</p>
                )}
              </div>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="role-form"
            disabled={isSubmitting || modulesLoading}
            className="gap-2"
          >
            {(isSubmitting || modulesLoading) && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
