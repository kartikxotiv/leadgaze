'use client';

import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, GripVertical, Loader2, Plus, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';

import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  type Role,
  deleteRoleService,
  getRolesService,
  reorderRolesService,
} from '~/services/roles.service';

import { CreateRoleDialog } from './components/create-role-dialog';
import { EditRoleDialog } from './components/edit-role-dialog';

const EMPTY_ROLES: Role[] = [];

export default function RolesPage() {
  const queryClient = useQueryClient();
  const { currentWorkspace, canAccess } = useRBAC();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [orderedRoles, setOrderedRoles] = useState<Role[]>([]);
  const [draggedRoleIndex, setDraggedRoleIndex] = useState<number | null>(null);

  const columns = useMemo(
    () => [
      { id: 'role_name', label: 'Role Name' },
      { id: 'role_key', label: 'Role Key' },
      { id: 'hierarchy', label: 'Access Level' },
      { id: 'type', label: 'Type' },
      { id: 'status', label: 'Status' },
    ],
    [],
  );

  const { visibility, toggleVisibility, isVisible, reset } =
    useColumnVisibility('roles', {
      role_name: true,
      role_key: true,
      hierarchy: true,
      type: true,
      status: true,
    });

  // Fetch roles
  const {
    data: roles = EMPTY_ROLES,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['workspaceRoles', currentWorkspace?.id],
    queryFn: async () => {
      const res = await getRolesService(currentWorkspace?.id || '');
      return res?.data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Reorder mutation
  const reorderRolesMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      reorderRolesService({
        workspaceId: currentWorkspace?.id || '',
        orderedRoleIds: orderedIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspaceRoles', currentWorkspace?.id],
      });
      toast.success('Role order updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update role order');
    },
  });

  // Sync state when data fetches
  useEffect(() => {
    if (Array.isArray(roles)) {
      setOrderedRoles(
        [...roles].sort((a: Role, b: Role) => (b.hierarchy_level || 0) - (a.hierarchy_level || 0))
      );
    }
  }, [roles]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedRoleIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedRoleIndex === null || draggedRoleIndex === index) return;
    
    // Optimistic UI update
    const newOrderedRoles = [...orderedRoles];
    const draggedRole = newOrderedRoles[draggedRoleIndex];
    if (draggedRole) {
       newOrderedRoles.splice(draggedRoleIndex, 1);
       newOrderedRoles.splice(index, 0, draggedRole);
       setDraggedRoleIndex(index);
       setOrderedRoles(newOrderedRoles);
    }
  };

  const handleDragEnd = () => {
    setDraggedRoleIndex(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedRoleIndex(null);
    
    // Save to server
    const orderedIds = orderedRoles.map((r) => r.id);
    reorderRolesMutation.mutate(orderedIds);
  };

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: deleteRoleService,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspaceRoles', currentWorkspace?.id],
      });
      toast.success('Role deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete role');
    },
  });

  const handleDeleteRole = (roleId: string, isSystem: boolean) => {
    if (isSystem) {
      toast.error('System roles cannot be deleted');
      return;
    }

    if (confirm('Are you sure you want to delete this role?')) {
      deleteRoleMutation.mutate(roleId);
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setEditDialogOpen(true);
  };

  const getRoleColor = (role: Role) => {
    if (role.color) return role.color;
    const colorMap: Record<string, string> = {
      admin: '#ef4444',
    };
    return colorMap[role.role_key] || '#6b7280';
  };

  const getHierarchyLabel = (role: Role) => {
    if (role.role_key === 'admin') {
      return 'Admin (Highest)';
    }

    return `Level ${role.hierarchy_level || 0}`;
  };

  return (
    <ModuleGuard module="roles">
      <div className="flex h-[100dvh] flex-col">
        <div className="flex shrink-0 flex-col gap-2">
          <PageHeader
            title={`Roles Management (${Array.isArray(roles) ? roles.length : 0})`}
            description="Create and manage workspace roles with custom permissions"
          >
            <div className="flex items-center gap-2">
              {/* {canAccess('roles', 'create') && (
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  size="sm"
                  className="h-9 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Role
                </Button>
              )} */}

              {canAccess('roles', 'create') && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setCreateDialogOpen(true)}
                      className="h-8 w-8 bg-white p-0 text-black dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
                    >
                      <Plus className="h-4 w-4 text-gray-500 dark:text-white" />
                    </Button>
                  </TooltipTrigger>

                  <TooltipContent side="bottom">
                    <p>New Role</p>
                  </TooltipContent>
                </Tooltip>
              )}

              <ColumnVisibilitySelector
                columns={columns}
                visibility={visibility}
                onToggle={toggleVisibility}
                onReset={reset}
              />
            </div>
          </PageHeader>
          {/* Summary Cards */}
          <div className="px-6 pb-7">
            <div className="-mt-1 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    Total Roles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{roles.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    System Roles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {Array.isArray(roles)
                      ? roles.filter((r: Role) => r.is_system).length
                      : 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    Custom Roles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {Array.isArray(roles)
                      ? roles.filter((r: Role) => !r.is_system).length
                      : 0}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        <PageBody className="bg-sidebar sticky flex min-h-0 flex-1 shrink-0 flex-col overflow-hidden pt-6 pb-6">
          <div className="flex min-h-0 flex-1 flex-col space-y-6">
            {/* Roles Table */}
            <Card className="flex min-h-0 flex-1 flex-col border-none shadow-none">
              <CardHeader className="px-0">
                <div>
                  <CardTitle className="leading-tight">
                    Workspace Roles
                  </CardTitle>
                  <CardDescription>
                    Manage roles and their permissions
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                  </div>
                ) : error ? (
                  <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border p-4">
                    Failed to load roles
                  </div>
                ) : !Array.isArray(roles) || roles.length === 0 ? (
                  <div className="py-12 text-center">
                    <Shield className="text-muted-foreground/30 mx-auto mb-4 h-12 w-12" />
                    <p className="text-muted-foreground">No roles found</p>
                  </div>
                ) : (
                  <div className="listing-table-container min-w-0 flex-1 overflow-x-auto overflow-y-auto rounded-lg pb-6">
                    <table className="w-max min-w-full caption-bottom border-separate border-spacing-0 text-sm">
                      <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                        <TableRow>
                          {isVisible('role_name') && (
                            <TableHead>Role Name</TableHead>
                          )}
                          {isVisible('role_key') && (
                            <TableHead>Role Key</TableHead>
                          )}
                          {isVisible('hierarchy') && (
                            <TableHead>Access Level</TableHead>
                          )}
                          {isVisible('type') && <TableHead>Type</TableHead>}
                          {isVisible('status') && <TableHead>Status</TableHead>}
                          <TableHead className="bg-card sticky right-0 px-4 text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderedRoles?.map((role: Role, index: number) => (
                          <TableRow
                            key={role.id}
                            className={draggedRoleIndex === index ? 'opacity-50' : ''}
                            draggable={canAccess('roles', 'edit')}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e)}
                            onDragEnd={handleDragEnd}
                          >
                            {isVisible('role_name') && (
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  {canAccess('roles', 'edit') && (
                                    <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing" />
                                  )}
                                  <div
                                    className="h-3 w-3 rounded-full"
                                    style={{
                                      backgroundColor: getRoleColor(role),
                                    }}
                                  />
                                  <span className="font-medium">
                                    {role.role_name}
                                  </span>
                                </div>
                              </TableCell>
                            )}
                            {isVisible('role_key') && (
                              <TableCell>
                                <code className="bg-secondary rounded px-2 py-1 text-xs">
                                  {role.role_key}
                                </code>
                              </TableCell>
                            )}
                            {isVisible('hierarchy') && (
                              <TableCell>
                                <Badge variant="outline">
                                  {getHierarchyLabel(role)}
                                </Badge>
                              </TableCell>
                            )}
                            {isVisible('type') && (
                              <TableCell>
                                {role.is_system ? (
                                  <Badge className="border-blue-500/20 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-500">
                                    System
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Custom</Badge>
                                )}
                              </TableCell>
                            )}
                            {isVisible('status') && (
                              <TableCell>
                                {role.is_active ? (
                                  <Badge className="border-green-500/20 bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-500">
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Inactive</Badge>
                                )}
                              </TableCell>
                            )}
                            <TableCell className="bg-card sticky right-0 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!role.is_system &&
                                  canAccess('roles', 'edit') && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditRole(role)}
                                      className="gap-2"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                {canAccess('roles', 'delete') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleDeleteRole(role.id, role.is_system)
                                    }
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
                                    disabled={
                                      role.is_system ||
                                      deleteRoleMutation.isPending
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dialogs */}
          <CreateRoleDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
          />

          {editingRole && (
            <EditRoleDialog
              role={editingRole}
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              onSuccess={() => setEditingRole(null)}
            />
          )}
        </PageBody>
      </div>
    </ModuleGuard>
  );
}
