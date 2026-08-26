'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Shield, UserPlus } from 'lucide-react';

import { AppShell } from '@kit/ui/app-shell';
import { Button } from '@kit/ui/button';
import { PageBody, PageHeader, PageHeaderActions } from '@kit/ui/page';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@kit/ui/table';
import { Badge } from '@kit/ui/badge';
import { Skeleton } from '@kit/ui/skeleton';

import { AdminNavbar } from '~/components/admin-navbar';
import { getAdminRolesService, AdminRole } from '~/services/admin-roles.service';
import { InviteUserDialog } from './components/invite-user-dialog';
import { RoleDialog } from './components/role-dialog';

export default function AdminUsersPage() {
  const [isInviteUserDialogOpen, setIsInviteUserDialogOpen] = useState(false);
  const [roleDialogState, setRoleDialogState] = useState<{ open: boolean; role: AdminRole | null }>({
    open: false,
    role: null,
  });

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: getAdminRolesService,
  });

  return (
    <AppShell navbar={<AdminNavbar />}>
      <PageHeader
        title="Users & Roles"
        description="Manage administrative roles, permissions, and platform users."
      >
        <PageHeaderActions>
          <Button variant="outline" className="gap-2" onClick={() => setRoleDialogState({ open: true, role: null })}>
            <Plus className="h-4 w-4" />
            <span>Create Role</span>
          </Button>
          <Button variant="default" className="gap-2" onClick={() => setIsInviteUserDialogOpen(true)}>
            <UserPlus className="h-4 w-4" />
            <span>Invite User</span>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <PageBody className="flex flex-col gap-4">
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5} className="p-4">
                      <Skeleton className="h-6 w-full rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No roles found.
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium text-zinc-900 dark:text-white">
                      {role.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {role.description || '-'}
                    </TableCell>
                    <TableCell>
                      {role.is_system ? (
                        <Badge variant="secondary">System</Badge>
                      ) : (
                        <Badge variant="outline">Custom</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(role.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-blue-600 hover:text-blue-700"
                        onClick={() => setRoleDialogState({ open: true, role })}
                      >
                        <Shield className="h-4 w-4" />
                        Permissions
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </PageBody>

      <InviteUserDialog open={isInviteUserDialogOpen} onOpenChange={setIsInviteUserDialogOpen} />
      <RoleDialog
        open={roleDialogState.open}
        onOpenChange={(open) => setRoleDialogState({ open, role: open ? roleDialogState.role : null })}
        role={roleDialogState.role}
      />
    </AppShell>
  );
}
