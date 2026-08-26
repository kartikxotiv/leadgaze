'use client';

import { useEffect, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useUser } from '@kit/supabase/hooks/use-user';
import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@kit/ui/collapsible';
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
import {
  type Role,
  type RolePermission,
  getModulesService,
  getRolePermissionsService,
  updateRolePermissionsService,
  updateRoleService,
} from '~/services/roles.service';

interface EditRoleDialogProps {
  role: Role;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productKey?: string;
  onSuccess?: () => void;
}

const ROLE_COLORS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
];

export function EditRoleDialog({
  role,
  open,
  onOpenChange,
  productKey,
  onSuccess,
}: EditRoleDialogProps) {
  const { currentWorkspace } = useRBAC();
  const { data: user } = useUser();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    role_name: '',
    description: '',
    color: '#3b82f6',
    is_active: true,
  });

  const [selectedPermissions, setSelectedPermissions] = useState<
    Record<string, boolean>
  >({});
  const [expandedModules, setExpandedModules] = useState<
    Record<string, boolean>
  >({});

  // Fetch modules and features filtered by current product
  const { data: modulesData, isLoading: modulesLoading } = useQuery({
    queryKey: ['modules', productKey],
    queryFn: () => getModulesService(productKey),
    enabled: open,
  });

  // Fetch current role permissions
  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['rolePermissions', role.id],
    queryFn: async () => {
      const res = await getRolePermissionsService(role.id);
      return res?.data;
    },
    enabled: open && !!role.id,
  });

  useEffect(() => {
    if (open && role) {
      setFormData({
        role_name: role.role_name,
        description: role.description || '',
        color: role.color || '#3b82f6',
        is_active: role.is_active,
      });
    }
  }, [open, role]);

  // Pre-populate selected permissions
  useEffect(() => {
    if (open && permissionsData?.data) {
      const initialPermissions: Record<string, boolean> = {};
      permissionsData.data.forEach((perm: any) => {
        if (perm.can_access) {
          initialPermissions[perm.module_feature_id] = true;
        }
      });
      setSelectedPermissions(initialPermissions);
    }
  }, [open, permissionsData]);

  const updateRoleMutation = useMutation({
    mutationFn: async () => {
      // 1. Update basic role info
      await updateRoleService(role.id, {
        role_name: formData.role_name,
        description: formData.description,
        color: formData.color,
        is_active: formData.is_active,
      });

      // 2. Format and update permissions
      const permissions: RolePermission[] = Object.entries(selectedPermissions)
        .filter(([_, isSelected]) => isSelected)
        .map(([featureId]) => ({
          module_feature_id: featureId,
          can_access: true,
          access_level: 'all',
        }));

      await updateRolePermissionsService(role.id, permissions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspaceRoles', currentWorkspace?.id, productKey],
      });
      queryClient.invalidateQueries({
        queryKey: ['rolePermissions', role.id],
      });
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: ['userWorkspaces', user.id],
        });
      }
      toast.success('Role updated successfully');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update role');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.role_name) {
      toast.error('Role name is required');
      return;
    }
    if (permissionsLoading || modulesLoading) {
      toast.error('Please wait for permissions to load');
      return;
    }
    updateRoleMutation.mutate();
  };

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const togglePermission = (featureId: string) => {
    setSelectedPermissions((prev) => ({
      ...prev,
      [featureId]: !prev[featureId],
    }));
  };

  const toggleModulePermissions = (moduleId: string, features: any[]) => {
    const allSelected = features.every((f) => selectedPermissions[f.id]);
    const newPermissions = { ...selectedPermissions };

    features.forEach((feature) => {
      newPermissions[feature.id] = !allSelected;
    });

    setSelectedPermissions(newPermissions);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 flex h-fit flex-col gap-0 overflow-hidden p-0 sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
          <DialogDescription>
            Update the role details and settings
          </DialogDescription>
        </DialogHeader>

        <form id="dialog-form"
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto custom-spacing-x-y">
            <h3 className="primary-heading text-leadgaze-dark dark:text-white custom-sub-heading-dialog-form">Role Details</h3>
            <div className="space-y-2">
              <div>
                <Label htmlFor="role_name">Role Name <span className="text-red-500">*</span></Label>
                <Input
                  id="role_name"
                  value={formData.role_name}
                  onChange={(e) =>
                    setFormData({ ...formData, role_name: e.target.value })
                  }
                  disabled={updateRoleMutation.isPending}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  disabled={updateRoleMutation.isPending}
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Select
                    value={formData.color}
                    onValueChange={(value) =>
                      setFormData({ ...formData, color: value })
                    }
                  >
                    <SelectTrigger id="color">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: color.value }}
                            />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="is_active">Status</Label>
                <Select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, is_active: value === 'active' })
                  }
                >
                  <SelectTrigger id="is_active">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 border-t pt-2">
                <h3 className="primary-heading text-leadgaze-dark dark:text-white custom-sub-heading-dialog-form">Permissions</h3>
                {modulesLoading || permissionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : modulesData?.data && modulesData?.data?.length > 0 ? (
                  <div className="space-y-2 rounded-lg border p-2">
                    <div className="space-y-2">
                      {modulesData?.data?.map((module: any) => (
                        <Collapsible
                          key={module.id}
                          open={expandedModules[module.id] || false}
                          onOpenChange={() => toggleModuleExpanded(module.id)}
                        >
                          <div className="flex items-center gap-2">
                            <CollapsibleTrigger className="flex items-center gap-2">
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  expandedModules[module.id] ? '' : '-rotate-90'
                                }`}
                              />
                            </CollapsibleTrigger>
                            <Checkbox
                              checked={
                                module.features &&
                                module.features.length > 0 &&
                                module.features.every(
                                  (f: any) => selectedPermissions[f.id],
                                )
                              }
                              onCheckedChange={() =>
                                toggleModulePermissions(
                                  module.id,
                                  module.features,
                                )
                              }
                            />
                            <label className="flex-1 cursor-pointer font-medium">
                              {module.module_name}
                            </label>
                          </div>

                          <CollapsibleContent className="space-y-3 pt-3 pb-1 pl-8">
                            {module.features && module.features.length > 0 ? (
                              module.features.map((feature: any) => (
                                <div
                                  key={feature.id}
                                  className="flex items-center gap-2"
                                >
                                  <Checkbox
                                    id={feature.id}
                                    checked={
                                      selectedPermissions[feature.id] || false
                                    }
                                    onCheckedChange={() =>
                                      togglePermission(feature.id)
                                    }
                                  />
                                  <Label
                                    htmlFor={feature.id}
                                    className="flex-1 cursor-pointer text-sm"
                                  >
                                    <span className="font-medium">
                                      {feature.feature_name}
                                    </span>
                                    <span className="ml-2 text-xs text-slate-500">
                                      ({feature.feature_key})
                                    </span>
                                  </Label>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500">
                                No features available
                              </p>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No modules available</p>
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
              disabled={updateRoleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit" form="dialog-form"
              disabled={
                updateRoleMutation.isPending ||
                permissionsLoading ||
                modulesLoading
              }
              className="gap-2"
            >
              {(updateRoleMutation.isPending ||
                permissionsLoading ||
                modulesLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
