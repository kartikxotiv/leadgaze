'use client';

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Loader2, Plus, Shield, Trash2 } from 'lucide-react';
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
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  type Role,
  deleteRoleService,
  getRolesService,
} from '~/services/roles.service';

import { CreateRoleDialog } from './components/create-role-dialog';
import { EditRoleDialog } from './components/edit-role-dialog';
import { ModuleGuard } from '~/lib/rbac/module-guard';

export default function RolesPage() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useRBAC();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch roles
  const {
    data: roles = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['workspaceRoles', currentWorkspace?.id],
    queryFn: async () => {
      const res = await getRolesService(currentWorkspace?.id || '');
      console.log({ res });
      return res?.data;
    },
    enabled: !!currentWorkspace?.id,
  });

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
      manager: '#f97316',
      user: '#3b82f6',
      viewer: '#8b5cf6',
    };
    return colorMap[role.role_key] || '#6b7280';
  };

  const getHierarchyLabel = (level: number) => {
    if (level >= 100) return 'Admin';
    if (level >= 50) return 'Manager';
    if (level >= 10) return 'User';
    return 'Viewer';
  };

  return (
    <ModuleGuard module="roles">
      <PageHeader
        title="Roles Management"
        description="Create and manage workspace roles with custom permissions"
      />
      <PageBody>
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Roles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{roles?.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  System Roles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {roles?.filter((r: Role) => r.is_system).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Custom Roles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {roles?.filter((r: Role) => !r.is_system).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Roles Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Workspace Roles</CardTitle>
                  <CardDescription>
                    Manage roles and their permissions
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Role
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
                  Failed to load roles
                </div>
              ) : roles?.length === 0 ? (
                <div className="py-12 text-center">
                  <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No roles found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Role Key</TableHead>
                        <TableHead>Hierarchy</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles?.map((role: Role) => (
                        <TableRow
                          key={role.id}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: getRoleColor(role) }}
                              />
                              <span className="font-medium">
                                {role.role_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="rounded bg-secondary px-2 py-1 text-xs">
                              {role.role_key}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getHierarchyLabel(role.hierarchy_level)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {role.is_system ? (
                              <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-500 hover:bg-blue-500/20 border-blue-500/20">
                                System
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Custom</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {role.is_active ? (
                              <Badge className="bg-green-500/10 text-green-600 dark:text-green-500 hover:bg-green-500/20 border-green-500/20">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!role.is_system && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditRole(role)}
                                  className="gap-2"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteRole(role.id, role.is_system)
                                }
                                className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={
                                  role.is_system || deleteRoleMutation.isPending
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
    </ModuleGuard>
  );
}
