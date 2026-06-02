/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, Save } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Switch } from '@kit/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';

import { showToast } from '~/components/global/ToastAlert';
import { useRbac } from '~/components/rbac/rbac-context';
import {
  getRolePermissionsService,
  updateRolePermissionsService,
} from '~/services/rbac.service';
import { PermissionAccessLevel } from '~/types/rbac.type';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function PermissionMatrix({ roleId }: { roleId: string }) {
  const queryClient = useQueryClient();
  const [localPermissions, setLocalPermissions] = useState<Record<string, any>>(
    {},
  );
  const [isDirty, setIsDirty] = useState(false);
  const { hasPermission } = useRbac();

  const canEdit = hasPermission('roles', 'edit', 'team');

  const { data, isLoading } = useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: () => getRolePermissionsService(roleId),
  });

  // Hydrate local state when data arrives
  useMemo(() => {
    if (data?.data?.permissions) {
      const perms: Record<string, any> = {};
      data.data.permissions.forEach((p: any) => {
        perms[p.module_feature_id] = {
          can_access: p.can_access,
          access_level: p.access_level,
          can_view_sensitive_data: p.can_view_sensitive_data,
          can_override_owner: p.can_override_owner,
        };
      });
      setLocalPermissions(perms);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (permissions: any[]) =>
      updateRolePermissionsService(roleId, permissions),
    onSuccess: () => {
      showToast('Permissions updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['role-permissions', roleId] });
      setIsDirty(false);
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update permissions', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className={'text-muted-foreground py-20 text-center'}>
        Loading permission matrix...
      </div>
    );
  }

  const modules = data?.data?.modules || [];

  const handleToggle = (featureId: string, checked: boolean) => {
    setLocalPermissions((prev) => ({
      ...prev,
      [featureId]: {
        ...(prev[featureId] || {
          access_level: 'own',
          can_view_sensitive_data: false,
          can_override_owner: false,
        }),
        can_access: checked,
      },
    }));
    setIsDirty(true);
  };

  const handleLevelChange = (
    featureId: string,
    level: PermissionAccessLevel,
  ) => {
    setLocalPermissions((prev) => ({
      ...prev,
      [featureId]: {
        ...(prev[featureId] || {
          can_access: false,
          can_view_sensitive_data: false,
          can_override_owner: false,
        }),
        access_level: level,
      },
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    const permissionsArray = Object.entries(localPermissions).map(
      ([id, val]) => ({
        module_feature_id: id,
        ...val,
      }),
    );
    updateMutation.mutate(permissionsArray);
  };

  return (
    <div className={'space-y-4'}>
      <div
        className={
          'bg-background sticky top-0 z-10 flex items-center justify-between border-b py-3'
        }
      >
        <div>
          <h2 className={'text-xl font-semibold'}>Matrix Configuration</h2>
          <p className={'text-muted-foreground text-sm'}>
            Changes will only take effect after saving.
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={handleSave}
            disabled={!isDirty || updateMutation.isPending}
            className={'gap-2'}
          >
            <Save className={'h-4 w-4'} />
            {updateMutation.isPending ? 'Saving...' : 'Save Permissions'}
          </Button>
        )}
      </div>

      <TooltipProvider>
        {modules.map((module: any) => (
          <Card
            key={module.id}
            className={'overflow-hidden border-l-4'}
            style={{ borderLeftColor: '#3b82f6' }}
          >
            <CardHeader className={'bg-secondary/10'}>
              <div className={'flex items-center gap-2'}>
                <CardTitle className={'text-lg'}>
                  {module.module_name}
                </CardTitle>
                <Badge variant={'outline'}>{module.module_key}</Badge>
              </div>
              <CardDescription>{module.description}</CardDescription>
            </CardHeader>
            <CardContent className={'p-0'}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={'w-[300px]'}>Feature</TableHead>
                    <TableHead className={'w-[100px] text-center'}>
                      Access
                    </TableHead>
                    <TableHead className={'w-[200px]'}>Data Scope</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {module.features.map((feature: any) => {
                    const perm = localPermissions[feature.id] || {
                      can_access: false,
                      access_level: 'none',
                    };

                    return (
                      <TableRow key={feature.id}>
                        <TableCell className={'font-medium'}>
                          <div className={'flex items-center gap-2'}>
                            {feature.feature_name}
                            {feature.is_system && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info
                                    className={'text-muted-foreground h-3 w-3'}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  System Reserved Feature
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={'text-center'}>
                          <Switch
                            checked={perm.can_access}
                            onCheckedChange={(checked) =>
                              handleToggle(feature.id, checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            disabled={!perm.can_access}
                            value={perm.access_level}
                            onValueChange={(val) =>
                              handleLevelChange(
                                feature.id,
                                val as PermissionAccessLevel,
                              )
                            }
                          >
                            <SelectTrigger className={'h-8'}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={'none'}>None</SelectItem>
                              <SelectItem value={'own'}>Own Records</SelectItem>
                              <SelectItem value={'team'}>
                                Organization Records
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className={'text-muted-foreground text-xs'}>
                          {feature.description}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </TooltipProvider>
    </div>
  );
}
