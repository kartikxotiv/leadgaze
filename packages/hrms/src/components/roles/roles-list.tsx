/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Edit, Shield, Trash2, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { showToast } from '~/components/global/ToastAlert';
import { deleteRoleService, listRolesService } from '~/services/rbac.service';
import { useRbac } from '~/components/rbac/rbac-context';

export function RolesList() {
  const queryClient = useQueryClient();
  const { hasPermission } = useRbac();

  const canEdit = hasPermission('roles', 'edit', 'team');
  const canDelete = hasPermission('roles', 'delete', 'team');

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: listRolesService,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRoleService,
    onSuccess: () => {
      showToast('Role deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to delete role', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className={'space-y-4'}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={'h-12 w-full animate-pulse rounded-lg bg-secondary/20'} />
        ))}
      </div>
    );
  }

  const roles = data?.data || [];

  return (
    <div className={'rounded-lg border bg-card'}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={'w-[250px]'}>Role Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className={'w-[120px]'}>Hierarchy</TableHead>
            <TableHead className={'w-[100px] text-right'}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role: any) => (
            <TableRow key={role.id}>
              <TableCell className={'font-medium'}>
                <div className={'flex items-center gap-2'}>
                  <div
                    className={'h-3 w-3 rounded-full'}
                    style={{ backgroundColor: role.color || '#94a3b8' }}
                  />
                  {role.role_name}
                  {role.is_system && (
                    <Badge variant={'secondary'} className={'text-[10px] h-4'}>
                      System
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className={'text-muted-foreground'}>
                {role.description || 'No description provided.'}
              </TableCell>
              <TableCell>
                <div className={'flex items-center gap-2'}>
                  <UserCheck className={'h-3 w-3 text-muted-foreground'} />
                  <span className={'text-sm'}>Level {role.hierarchy_level}</span>
                </div>
              </TableCell>
              <TableCell className={'text-right'}>
                <div className={'flex items-center justify-end gap-1'}>
                  {canEdit && (
                    <Button size={'icon'} variant={'ghost'} asChild className={'h-8 w-8'}>
                      <Link href={`/home/roles/${role.id}`}>
                        <Edit className={'h-4 w-4'} />
                      </Link>
                    </Button>
                  )}

                  {!role.is_system && canDelete && (
                    <Button
                      size={'icon'}
                      variant={'ghost'}
                      className={'h-8 w-8 text-destructive hover:bg-destructive/10'}
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this custom role?')) {
                          deleteMutation.mutate(role.id);
                        }
                      }}
                    >
                      <Trash2 className={'h-4 w-4'} />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {roles.length === 0 && (
        <div className={'py-20 text-center'}>
          <Shield className={'mx-auto h-12 w-12 text-muted-foreground/20'} />
          <h3 className={'mt-4 text-lg font-medium'}>No roles found</h3>
          <p className={'text-muted-foreground'}>Create your first custom role to get started.</p>
        </div>
      )}
    </div>
  );
}
