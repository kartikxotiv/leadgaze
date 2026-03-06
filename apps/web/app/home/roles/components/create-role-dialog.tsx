'use client';

import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Loader2, Plus } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  createHierarchyService,
  getHierarchiesService,
} from '~/services/hierarchies.service';
import {
  type RolePermission,
  createRoleService,
  getModulesService,
} from '~/services/roles.service';

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
    hierarchy_id: '',
    color: '#3b82f6',
  });
  const [isCustomHierarchy, setIsCustomHierarchy] = useState(false);
  const [customHierarchyName, setCustomHierarchyName] = useState('');

  // Fetch persistent hierarchies
  const { data: hierarchiesData, isLoading: hierarchiesLoading } = useQuery({
    queryKey: ['workspaceHierarchies', currentWorkspace?.id],
    queryFn: () => getHierarchiesService(currentWorkspace?.id || ''),
    enabled: !!currentWorkspace?.id && open,
  });

  const hierarchyOptions = useMemo(() => {
    if (!hierarchiesData || hierarchiesData.length === 0) {
      return [];
    }
    return hierarchiesData.map((h: any) => ({
      value: h.id,
      levelValue: h.level.toString(),
      label: `${h.name} (${h.level})`,
    }));
  }, [hierarchiesData]);

  const createHierarchyMutation = useMutation({
    mutationFn: (payload: { name: string; level: number }) =>
      createHierarchyService({
        workspace_id: currentWorkspace?.id || '',
        ...payload,
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ['workspaceHierarchies', currentWorkspace?.id],
      });
      toast.success('New hierarchy level created');
      setFormData({ ...formData, hierarchy_id: data.id });
      setIsCustomHierarchy(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create hierarchy level');
    },
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
        hierarchy_id: formData.hierarchy_id,
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
        hierarchy_id: '',
        color: '#3b82f6',
      });
      setIsCustomHierarchy(false);
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
    if (!formData.hierarchy_id) {
      toast.error('Hierarchy level is required');
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
      <DialogContent className="flex h-fit max-h-[95vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[700px]">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>New Role</DialogTitle>
          <DialogDescription>
            Create a new role and assign permissions to it
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-6 pt-0">
            <div className="space-y-6 pt-6">
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="hierarchy">Hierarchy Level *</Label>
                      {isCustomHierarchy && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs text-blue-600"
                          onClick={() => {
                            setIsCustomHierarchy(false);
                            setFormData({
                              ...formData,
                              hierarchy_id: hierarchyOptions[0]?.value || '',
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                    {isCustomHierarchy ? (
                      <div className="space-y-3">
                        <Input
                          placeholder="Hierarchy Name (e.g., Sub Admin)"
                          value={customHierarchyName}
                          onChange={(e) =>
                            setCustomHierarchyName(e.target.value)
                          }
                        />
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Level (e.g., 95)"
                            min="0"
                            max="1000"
                            value={(formData as any).temp_level || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData({
                                ...formData,
                                temp_level: val,
                              } as any);
                            }}
                            autoFocus
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              const levelToUse = (formData as any).temp_level;
                              if (!customHierarchyName || !levelToUse) {
                                toast.error('Please enter name and level');
                                return;
                              }
                              createHierarchyMutation.mutate({
                                name: customHierarchyName,
                                level: parseInt(levelToUse),
                              });
                            }}
                            disabled={createHierarchyMutation.isPending}
                          >
                            {createHierarchyMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Save'
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between font-normal"
                          >
                            {hierarchiesLoading ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Loading...
                              </span>
                            ) : hierarchyOptions.length > 0 ? (
                              hierarchyOptions.find(
                                (opt: any) =>
                                  opt.value === formData.hierarchy_id,
                              )?.label || 'Select Level'
                            ) : (
                              'No levels available'
                            )}
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                          <div className="flex flex-col">
                            {hierarchyOptions.map((level: any) => (
                              <div
                                key={level.value}
                                className="flex items-center gap-1 p-1 hover:bg-slate-50"
                              >
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsCustomHierarchy(true);
                                    setCustomHierarchyName(
                                      level.label.split(' (')[0],
                                    );
                                    setFormData({
                                      ...formData,
                                      hierarchy_id: '',
                                      temp_level: '',
                                    } as any);
                                  }}
                                  title="Add Custom Sub-Level"
                                >
                                  <Plus className="h-4 w-4 font-bold" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-8 flex-1 justify-start font-normal"
                                  onClick={() =>
                                    setFormData({
                                      ...formData,
                                      hierarchy_id: level.value,
                                    })
                                  }
                                >
                                  {level.label}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
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
                  <div className="space-y-2 rounded-lg border p-3">
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
                                    checked={
                                      selectedPermissions[feature.id] || false
                                    }
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
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No modules available</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t bg-white px-6 py-4">
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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
