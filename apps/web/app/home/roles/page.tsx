'use client';

import { useEffect, useMemo, useState } from 'react';

import { usePathname } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Edit2,
  GripVertical,
  Plus,
  Shield,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import CustomTableContainer from '@kit/ui/custom-table-container';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader } from '@kit/ui/page';
import { StatusFilterDropdown } from '@kit/ui/status-filter-dropdown';
import { Skeleton } from '@kit/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';
import { useColumnResize } from '@kit/ui/use-column-resize';
import { useTableSort } from '@kit/ui/use-table-sort';
import { SortableTableHead } from '@kit/ui/sortable-table-head';

import { useDebounce } from '~/lib/hooks/use-debounce';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getModuleKeyFromPath } from '~/lib/rbac/route-module-map';
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
  const pathname = usePathname();
  const productKey = getModuleKeyFromPath(pathname);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [orderedRoles, setOrderedRoles] = useState<Role[]>([]);
  const [draggedRoleIndex, setDraggedRoleIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

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

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('roles');


  const { sortColumn, sortDirection, toggleSort, sortState } = useTableSort<Role>(
    'roles',
    [],
    { mode: 'server' }
  );

  // Fetch roles filtered by current product/module
  const {
    data: roles = EMPTY_ROLES,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['workspaceRoles', currentWorkspace?.id, productKey, sortState, typeFilter, statusFilter, debouncedSearchTerm],
    queryFn: async () => {
      const res = await getRolesService(
        currentWorkspace?.id || '',
        productKey,
        sortColumn || undefined,
        sortDirection || undefined,
        {
          type: typeFilter && typeFilter !== 'all' ? typeFilter : undefined,
          status:
            statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
          searchTerm: debouncedSearchTerm || undefined,
        }
      );
      return res?.data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  const filterGroups = useMemo(() => {
    return [
      {
        key: 'type',
        label: 'Type',
        selectedValue: typeFilter || undefined,
        selectedLabel:
          typeFilter === 'system'
            ? 'System'
            : typeFilter === 'custom'
              ? 'Custom'
              : undefined,
        options: [
          { value: 'system', label: 'System' },
          { value: 'custom', label: 'Custom' },
        ],
        onSelect: (val: string) => setTypeFilter(val),
      },
      {
        key: 'status',
        label: 'Status',
        selectedValue: statusFilter || undefined,
        selectedLabel:
          statusFilter === 'active'
            ? 'Active'
            : statusFilter === 'inactive'
              ? 'Inactive'
              : undefined,
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
        onSelect: (val: string) => setStatusFilter(val),
      },
    ];
  }, [typeFilter, statusFilter]);

  // Filtered roles based on type filter and search term
  const filteredRoles = useMemo(() => {
    return orderedRoles;
  }, [orderedRoles]);

  const isDragDisabled =
    (sortColumn !== null && sortColumn !== 'hierarchy_level') ||
    (typeFilter !== 'all' && typeFilter !== '') ||
    !!debouncedSearchTerm;

  // Reorder mutation
  const reorderRolesMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      reorderRolesService({
        workspaceId: currentWorkspace?.id || '',
        orderedRoleIds: orderedIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspaceRoles', currentWorkspace?.id, productKey],
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
      setOrderedRoles(roles);
    }
  }, [roles]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedRoleIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image();
    img.src =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
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
        queryKey: ['workspaceRoles', currentWorkspace?.id, productKey],
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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (typeFilter && typeFilter !== 'all') count++;
    if (statusFilter && statusFilter !== 'all') count++;
    return count;
  }, [typeFilter, statusFilter]);

  const handleClearFilters = () => {
    setTypeFilter('');
    setStatusFilter('');
  };

  return (
    <ModuleGuard module="roles">
      <div className="flex shrink-0 flex-col gap-2 overflow-hidden">
        <PageHeader
          title={`Roles Management (${roles.length})`}
          description="Create and manage workspace roles with custom permissions"
        />
      </div>

      {/* Toolbar with search, type filter, actions */}
      <div className="w-full max-w-full min-w-0 shrink-0 border-b pb-2">
        <ListToolBar
          filterGroups={filterGroups}
          showFilter
          filterLabel="Show Filters"
          activeFilterCount={activeFilterCount}
          onClearFilters={handleClearFilters}
          showSearch
          searchPlaceholder="Search roles..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          actions={[
            ...(canAccess('roles', 'create')
              ? [
                  {
                    key: 'add',
                    label: 'New Role',
                    icon: Plus,
                    onClick: () => setCreateDialogOpen(true),
                    show: true,
                    buttonVariant: 'default' as const,
                  },
                ]
              : []),
          ]}
          columnVisibilitySlot={
            <ColumnVisibilitySelector
              columns={columns}
              visibility={visibility}
              onToggle={toggleVisibility}
              onReset={reset}
            />
          }
        />
      </div>
      <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 gap-0">
          <CustomTableContainer>
            {isLoading ? (
              <div className="listing-table-container min-w-0 flex-1 overflow-x-auto overflow-y-auto rounded-lg pb-6">
                <Table className="w-max min-w-full caption-bottom border-separate border-spacing-0 text-sm">
                  <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      {isVisible('role_name') && (
                        <TableHead>Role Name</TableHead>
                      )}
                      {isVisible('role_key') && <TableHead>Role Key</TableHead>}
                      {isVisible('hierarchy') && (
                        <TableHead>Access Level</TableHead>
                      )}
                      {isVisible('type') && <TableHead>Type</TableHead>}
                      {isVisible('status') && <TableHead>Status</TableHead>}
                      <TableHead className="sticky right-0 px-4 text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(8)].map((_, i) => (
                      <TableRow key={i}>
                         <TableCell
                           className="h-[52px] px-4 py-2"
                           colSpan={6}
                         >
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : error ? (
              <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border p-4">
                Failed to load roles
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="py-12 text-center table-row-border">
                <Shield className="text-muted-foreground/30 mx-auto mb-4 h-12 w-12" />
                <p className="text-muted-foreground">No roles found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {isVisible('role_name') && (
  <SortableTableHead
    label="Role Name"
    columnId="role_name"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('role_name')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('role_name')} />
  </SortableTableHead>
)}
                    {isVisible('role_key') && (
  <SortableTableHead
    label="Role Key"
    columnId="role_key"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('role_key')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('role_key')} />
  </SortableTableHead>
)}
                    {isVisible('hierarchy') && (
  <SortableTableHead
    label="Access Level"
    columnId="hierarchy"
    sortKey="hierarchy_level"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    sortable={false}
    className="relative"
    {...getHeaderProps('hierarchy')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('hierarchy')} />
  </SortableTableHead>
)}
                    {isVisible('type') && (
  <SortableTableHead
    label="Type"
    columnId="type"
    sortKey="is_system"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('type')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('type')} />
  </SortableTableHead>
)}
                    {isVisible('status') && (
  <SortableTableHead
    label="Status"
    columnId="status"
    sortKey="is_active"
    sortColumn={sortColumn}
    sortDirection={sortDirection}
    onSort={toggleSort}
    className="relative"
    {...getHeaderProps('status')}
  >
    <span className="col-resize-handle" {...getResizeHandleProps('status')} />
  </SortableTableHead>
)}
                    <TableHead className="sticky-right-header text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles?.map((role: Role, index: number) => (
                    <TableRow
                      key={role.id}
                      className={draggedRoleIndex === index ? 'opacity-50' : ''}
                      draggable={!isDragDisabled && canAccess('roles', 'edit')}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e)}
                      onDragEnd={handleDragEnd}
                    >
                      {isVisible('role_name') && (
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {canAccess('roles', 'edit') && (
                              <GripVertical className="text-muted-foreground hover:text-foreground h-4 w-4 cursor-grab active:cursor-grabbing" />
                            )}
                            <div
                              className="h-2 w-2 rounded-full"
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
                          <Badge
                            variant="outline"
                            className="dark-button-border-color"
                          >
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
                          {!role.is_system && canAccess('roles', 'edit') && (
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
                                role.is_system || deleteRoleMutation.isPending
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
              </Table>            
            )}        
          </CustomTableContainer>  
        </div>

        {/* Dialogs */}
        <CreateRoleDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          productKey={productKey}
        />

        {editingRole && (
          <EditRoleDialog
            role={editingRole}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            productKey={productKey}
            onSuccess={() => setEditingRole(null)}
          />
        )}
      </PageBody>
    </ModuleGuard>
  );
}
