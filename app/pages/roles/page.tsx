"use client";
import React, { useCallback, useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  useWorkspaceRoles,
  useCreateWorkspaceRole,
  useUpdateWorkspaceRole,
} from "@/hooks/use-workspace-roles";
import { Button } from "@/components/ui/button";
import { Plus, Lock, Info, ShieldAlert } from "lucide-react";
import { SidebarPanel } from "@/components/common/sidebar-panel";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  Form,
  FormLabel,
  FormControl,
  FormItem,
  FormField,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { FormActions } from "@/components/common/form-actions";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

interface RoutePermission {
  route: string;
  visible: boolean;
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

const AVAILABLE_ROUTES = [
  "User",
  "Roles",
  "Leads",
  "Contacts",
  "Companies",
  "Sales Leads",
  "Sales Contacts",
  "Team",
  "Pipeline",
  "Reports",
  "Communications",
  "Dashboard",
  "Settings",
];

export default function RolesPage() {
  const { data: workspaceRoles } = useWorkspaceRoles();
  const createRoleMutation = useCreateWorkspaceRole();
  const updateRoleMutation = useUpdateWorkspaceRole();
  const [addRoleSidebarOpen, setAddRoleSidebarOpen] = useState(false);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<
    Record<string, RoutePermission>
  >({});
  const { currentOrganization } = useAuthStore();

  // Check if user can manage roles (only admin and owner)
  const canManageRoles = useMemo(() => {
    if (!currentOrganization) return false;
    const userRole = currentOrganization.role?.toLowerCase();
    return ["owner", "admin"].includes(userRole || "");
  }, [currentOrganization]);

  const [permissions, setPermissions] = useState<
    Record<string, RoutePermission>
  >(() => {
    const initial: Record<string, RoutePermission> = {};
    AVAILABLE_ROUTES.forEach((route) => {
      initial[route] = {
        route,
        visible: true,
        view: true,
        create: true,
        update: true,
        delete: true,
      };
    });
    return initial;
  });

  const form = useForm({
    defaultValues: {
      name: "",
    },
  });

  const resetForm = useCallback(() => {
    form.reset();
    setIsCreatingRole(false);
    const defaultPerms: Record<string, RoutePermission> = {};
    AVAILABLE_ROUTES.forEach((route) => {
      defaultPerms[route] = {
        route,
        visible: true,
        view: true,
        create: true,
        update: true,
        delete: true,
      };
    });
    setPermissions(defaultPerms);
  }, [form]);

  const handleAddRoleSidebarOpenChange = useCallback(
    (open: boolean) => {
      setAddRoleSidebarOpen(open);
      if (!open && !isCreatingRole) {
        // Reset if closing and not in create mode
        resetForm();
        setIsCreatingRole(false);
      }
    },
    [isCreatingRole, resetForm]
  );

  const handlePermissionChange = useCallback(
    (route: string, field: keyof RoutePermission, value: boolean) => {
      if (editingRoleId) {
        setEditingPermissions((prev) => ({
          ...prev,
          [route]: {
            ...(prev[route] || {
              route,
              visible: true,
              view: true,
              create: true,
              update: true,
              delete: true,
            }),
            [field]: value,
          },
        }));
      } else {
        setPermissions((prev) => ({
          ...prev,
          [route]: {
            ...prev[route],
            [field]: value,
          },
        }));
      }
    },
    [editingRoleId]
  );

  const onSubmit = useCallback(
    async (data: any) => {
      try {
        const permissionsData: Record<string, any> = {};
        Object.values(permissions).forEach((perm) => {
          permissionsData[perm.route] = {
            visible: perm.visible,
            view: perm.view,
            create: perm.create,
            update: perm.update,
            delete: perm.delete,
          };
        });

        await createRoleMutation.mutateAsync({
          name: data.name,
          permissions: permissionsData,
        });

        toast.success("Role created successfully");
        resetForm();
        setIsCreatingRole(false);
        setAddRoleSidebarOpen(false);
      } catch (error: any) {
        toast.error(error?.message || "Failed to create role");
      }
    },
    [createRoleMutation, permissions, resetForm]
  );

  const handleUpdateRole = useCallback(
    async (roleId: string) => {
      try {
        const permissionsData: Record<string, any> = {};
        Object.values(editingPermissions).forEach((perm) => {
          permissionsData[perm.route] = {
            visible: perm.visible,
            view: perm.view,
            create: perm.create,
            update: perm.update,
            delete: perm.delete,
          };
        });

        await updateRoleMutation.mutateAsync({
          id: roleId,
          permissions: permissionsData,
        });

        toast.success("Role permissions updated successfully");
        setEditingRoleId(null);
        setEditingPermissions({});
      } catch (error: any) {
        toast.error(error?.message || "Failed to update role permissions");
      }
    },
    [updateRoleMutation, editingPermissions]
  );

  const handleStartEdit = useCallback((role: any) => {
    const rolePermissions = role.permissions || {};
    const initialPermissions: Record<string, RoutePermission> = {};

    AVAILABLE_ROUTES.forEach((route) => {
      const existingPerm = rolePermissions[route];
      initialPermissions[route] = {
        route,
        visible: existingPerm?.visible ?? false,
        view: existingPerm?.view ?? false,
        create: existingPerm?.create ?? false,
        update: existingPerm?.update ?? false,
        delete: existingPerm?.delete ?? false,
      };
    });

    setEditingPermissions(initialPermissions);
    setEditingRoleId(role.id);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingRoleId(null);
    setEditingPermissions({});
  }, []);

  return (
    <>
      <DashboardLayout>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-medium tracking-tight">Roles</h1>
          {canManageRoles && (
            <div className="flex items-center gap-3">
              <Button onClick={() => handleAddRoleSidebarOpenChange(true)}>
                <Plus className="h-4 w-4" />
                Add New Role
              </Button>
            </div>
          )}
        </div>

        {!canManageRoles && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  Permission Required
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Only Administrators and Owners can create and manage roles.
                  Please contact your organization administrator if you need to
                  create a new role.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-2 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <Lock className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold text-lg">
                Permissions Matrix
                {form.watch("name") && (
                  <span className="ml-2 text-primary">
                    - {form.watch("name")}
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure access levels for different routes and features.
              </p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">
                      {isCreatingRole ? "ROUTE NAME" : "ROLE NAME"}
                    </TableHead>
                    <TableHead className="text-center">VISIBLE</TableHead>
                    <TableHead className="text-center">VIEW</TableHead>
                    <TableHead className="text-center">CREATE</TableHead>
                    <TableHead className="text-center">UPDATE</TableHead>
                    <TableHead className="text-center">DELETE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCreatingRole ? (
                    // Show permissions matrix for creating new role
                    AVAILABLE_ROUTES.map((route) => {
                      const routePerm = permissions[route];
                      return (
                        <TableRow
                          key={route}
                          className={routePerm?.visible ? "" : "opacity-60"}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{route}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                type="button"
                              >
                                Route
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={routePerm?.visible ?? true}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(
                                  route,
                                  "visible",
                                  checked
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={routePerm?.view ?? true}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(
                                  route,
                                  "view",
                                  checked === true
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={routePerm?.create ?? true}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(
                                  route,
                                  "create",
                                  checked === true
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={routePerm?.update ?? true}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(
                                  route,
                                  "update",
                                  checked === true
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={routePerm?.delete ?? true}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(
                                  route,
                                  "delete",
                                  checked === true
                                )
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : // Show existing roles from database
                  workspaceRoles?.data && workspaceRoles.data.length > 0 ? (
                    workspaceRoles.data.map((role: any) => {
                      const isEditing = editingRoleId === role.id;
                      const rolePermissions = role.permissions || {};

                      // Calculate summary for non-editing mode
                      const allRoutes = Object.keys(rolePermissions);
                      const hasAnyVisible = allRoutes.some(
                        (r) => rolePermissions[r]?.visible === true
                      );
                      const hasAnyView = allRoutes.some(
                        (r) => rolePermissions[r]?.view === true
                      );
                      const hasAnyCreate = allRoutes.some(
                        (r) => rolePermissions[r]?.create === true
                      );
                      const hasAnyUpdate = allRoutes.some(
                        (r) => rolePermissions[r]?.update === true
                      );
                      const hasAnyDelete = allRoutes.some(
                        (r) => rolePermissions[r]?.delete === true
                      );

                      // Use editing permissions if in edit mode
                      const currentPermissions = isEditing
                        ? editingPermissions
                        : null;

                      return (
                        <React.Fragment key={role.id}>
                          {/* Main role row */}
                          <TableRow>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{role.name}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  type="button"
                                >
                                  Role
                                </Button>
                                {canManageRoles && !isEditing && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => handleStartEdit(role)}
                                    type="button"
                                  >
                                    Edit
                                  </Button>
                                )}
                                {isEditing && (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => handleUpdateRole(role.id)}
                                      disabled={updateRoleMutation.isPending}
                                      type="button"
                                    >
                                      {updateRoleMutation.isPending
                                        ? "Saving..."
                                        : "Save"}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={handleCancelEdit}
                                      type="button"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            {!isEditing ? (
                              <>
                                <TableCell className="text-center">
                                  <Switch checked={hasAnyVisible} disabled />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Checkbox checked={hasAnyView} disabled />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Checkbox checked={hasAnyCreate} disabled />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Checkbox checked={hasAnyUpdate} disabled />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Checkbox checked={hasAnyDelete} disabled />
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell className="text-center" colSpan={5}>
                                  <span className="text-sm text-muted-foreground">
                                    Edit permissions below
                                  </span>
                                </TableCell>
                              </>
                            )}
                          </TableRow>

                          {/* Expanded permissions rows when editing */}
                          {isEditing && currentPermissions && (
                            <>
                              {AVAILABLE_ROUTES.map((route) => {
                                const routePerm = currentPermissions[route] || {
                                  route,
                                  visible: false,
                                  view: false,
                                  create: false,
                                  update: false,
                                  delete: false,
                                };
                                return (
                                  <TableRow
                                    key={`${role.id}-${route}`}
                                    className={
                                      !routePerm.visible
                                        ? "opacity-60 bg-muted/30"
                                        : "bg-muted/30"
                                    }
                                  >
                                    <TableCell>
                                      <div className="flex items-center gap-2 pl-6">
                                        <span className="font-medium">
                                          {route}
                                        </span>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-6 px-2 text-xs"
                                          type="button"
                                        >
                                          Route
                                        </Button>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Switch
                                        checked={routePerm.visible}
                                        disabled={!canManageRoles}
                                        onCheckedChange={(checked) =>
                                          handlePermissionChange(
                                            route,
                                            "visible",
                                            checked
                                          )
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Checkbox
                                        checked={routePerm.view}
                                        disabled={!canManageRoles}
                                        onCheckedChange={(checked) =>
                                          handlePermissionChange(
                                            route,
                                            "view",
                                            checked === true
                                          )
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Checkbox
                                        checked={routePerm.create}
                                        disabled={!canManageRoles}
                                        onCheckedChange={(checked) =>
                                          handlePermissionChange(
                                            route,
                                            "create",
                                            checked === true
                                          )
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Checkbox
                                        checked={routePerm.update}
                                        disabled={!canManageRoles}
                                        onCheckedChange={(checked) =>
                                          handlePermissionChange(
                                            route,
                                            "update",
                                            checked === true
                                          )
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Checkbox
                                        checked={routePerm.delete}
                                        disabled={!canManageRoles}
                                        onCheckedChange={(checked) =>
                                          handlePermissionChange(
                                            route,
                                            "delete",
                                            checked === true
                                          )
                                        }
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No roles found. Create a new role to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <Info className="h-4 w-4 text-primary mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Changes will be applied immediately after saving.
            </p>
          </div>

          {isCreatingRole && canManageRoles && (
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={resetForm}>
                Reset Permissions
              </Button>
              <Button
                onClick={async () => {
                  const roleName = form.getValues("name");
                  if (!roleName || !roleName.trim()) {
                    toast.error("Please enter a role name first");
                    handleAddRoleSidebarOpenChange(true);
                    return;
                  }
                  await onSubmit({ name: roleName });
                }}
                disabled={createRoleMutation.isPending}
              >
                {createRoleMutation.isPending ? "Creating..." : "Create Role"}
              </Button>
            </div>
          )}
        </div>

        <SidebarPanel
          open={addRoleSidebarOpen}
          onOpenChange={handleAddRoleSidebarOpenChange}
          title="Add Role"
          description={"Enter a name for the new role"}
        >
          <div className="space-y-6">
            <Form {...form}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddRoleSidebarOpenChange(false);
                }}
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Manager" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormActions
                  onCancel={() => {
                    resetForm();
                    handleAddRoleSidebarOpenChange(false);
                  }}
                  onSubmit={() => {
                    if (!canManageRoles) {
                      toast.error("You don't have permission to create roles");
                      return;
                    }
                    const roleName = form.getValues("name");
                    if (!roleName || !roleName.trim()) {
                      toast.error("Please enter a role name");
                      return;
                    }
                    setIsCreatingRole(true);
                    handleAddRoleSidebarOpenChange(false);
                  }}
                  submitText="Continue"
                  isLoading={false}
                />
              </form>
            </Form>
          </div>
        </SidebarPanel>
      </DashboardLayout>
    </>
  );
}
