'use client';

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  type RolePermission,
  createRoleService,
  getModulesService,
} from '~/services/roles.service';

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HIERARCHY_LEVELS = [
  { value: '100', label: 'Admin (100)' },
  // { value: '50', label: 'Manager (50)' },
  // { value: '10', label: 'User (10)' },
  // { value: '1', label: 'Viewer (1)' },
];

const ROLE_COLORS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
];

export function CreateRoleDialog({
  open,
  onOpenChange,
}: CreateRoleDialogProps) {
  const { currentWorkspace } = useRBAC();
  const queryClient = useQueryClient();
  const [selectedPermissions, setSelectedPermissions] = useState<
    Record<string, boolean>
  >({});
  const [expandedModules, setExpandedModules] = useState<
    Record<string, boolean>
  >({});

  const [formData, setFormData] = useState({
    role_name: '',
    role_key: '',
    description: '',
    hierarchy_level: '10',
    color: '#3b82f6',
  });

  // Fetch modules and features
  const { data: modulesData, isLoading: modulesLoading } = useQuery({
    queryKey: ['modules'],
    queryFn: () => getModulesService(),
    enabled: open,
  });

  const createRoleMutation = useMutation({
    mutationFn: () => {
      // Convert selected permissions to the proper format
      const permissions: RolePermission[] = Object.entries(selectedPermissions)
        .filter(([_, isSelected]) => isSelected)
        .map(([featureId]) => ({
          module_feature_id: featureId,
          can_access: true,
          access_level: 'all',
        }));

      return createRoleService(currentWorkspace?.id || '', {
        role_name: formData.role_name,
        role_key: formData.role_key,
        description: formData.description,
        hierarchy_level: parseInt(formData.hierarchy_level),
        color: formData.color,
        permissions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspaceRoles', currentWorkspace?.id],
      });
      toast.success('Role created successfully');
      setFormData({
        role_name: '',
        role_key: '',
        description: '',
        hierarchy_level: '10',
        color: '#3b82f6',
      });
      setSelectedPermissions({});
      setExpandedModules({});
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create role');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.role_name || !formData.role_key) {
      toast.error('Role name and key are required');
      return;
    }
    createRoleMutation.mutate();
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>New Role</DialogTitle>
          <DialogDescription>
            Create a new role and assign permissions to it
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role Details Section */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-sm font-semibold">Role Details</h3>

            <div className="space-y-2">
              <Label htmlFor="role_name">Role Name *</Label>
              <Input
                id="role_name"
                placeholder="e.g., Senior Manager"
                value={formData.role_name}
                onChange={(e) =>
                  setFormData({ ...formData, role_name: e.target.value })
                }
                disabled={createRoleMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role_key">Role Key *</Label>
              <Input
                id="role_key"
                placeholder="e.g., senior_manager"
                value={formData.role_key}
                onChange={(e) =>
                  setFormData({ ...formData, role_key: e.target.value })
                }
                disabled={createRoleMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Describe this role's purpose"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={createRoleMutation.isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hierarchy">Hierarchy Level *</Label>
                <Select
                  value={formData.hierarchy_level}
                  onValueChange={(value) =>
                    setFormData({ ...formData, hierarchy_level: value })
                  }
                >
                  <SelectTrigger id="hierarchy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HIERARCHY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
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
          </div>

          {/* Permissions Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Permissions</h3>
            {modulesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : modulesData?.data && modulesData?.data?.length > 0 ? (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
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
                          toggleModulePermissions(module.id, module.features)
                        }
                      />
                      <label className="flex-1 cursor-pointer">
                        {module.module_name}
                      </label>
                    </div>

                    <CollapsibleContent className="space-y-2 pt-2 pl-8">
                      {module.features && module.features.length > 0 ? (
                        module.features.map((feature: any) => (
                          <div
                            key={feature.id}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              id={feature.id}
                              checked={selectedPermissions[feature.id] || false}
                              onCheckedChange={() =>
                                togglePermission(feature.id)
                              }
                            />
                            <label
                              htmlFor={feature.id}
                              className="flex-1 cursor-pointer text-sm"
                            >
                              <span className="font-medium">
                                {feature.feature_name}
                              </span>
                              <span className="ml-2 text-xs text-slate-500">
                                ({feature.feature_key})
                              </span>
                            </label>
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
            ) : (
              <p className="text-sm text-slate-500">No modules available</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createRoleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createRoleMutation.isPending || modulesLoading}
              className="gap-2"
            >
              {(createRoleMutation.isPending || modulesLoading) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              New Role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
