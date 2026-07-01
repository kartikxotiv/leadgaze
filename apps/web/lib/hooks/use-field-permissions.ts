'use client';

import { useMemo } from 'react';

import { usePathname } from 'next/navigation';

import {
  buildFieldPermissionContext,
  canEditField,
  canViewField,
  getEditableFields,
  getVisibleFields,
  LEAD_COLUMN_TO_FIELD_KEY,
} from '~/lib/field-permission';
import type { EntityField } from '~/lib/hooks/use-dynamic-columns';
import { useDynamicColumns } from '~/lib/hooks/use-dynamic-columns';
import { getModuleKeyFromPath } from '~/lib/rbac/route-module-map';
import { useRBAC } from '~/lib/rbac/rbac-provider';

interface UseFieldPermissionsOptions {
  entityType: string;
  workspaceId?: string;
  enabled?: boolean;
}

export function useFieldPermissions({
  entityType,
  workspaceId,
  enabled = true,
}: UseFieldPermissionsOptions) {
  const pathname = usePathname();
  const productKey = useMemo(
    () => getModuleKeyFromPath(pathname ?? '/home/sales'),
    [pathname],
  );
  const { currentWorkspace: workspace, user, canAccess } = useRBAC();

  const effectiveWorkspaceId = workspaceId ?? workspace?.id;

  const { fields = [], isLoading } = useDynamicColumns({
    entityType,
    workspaceId: effectiveWorkspaceId,
    userId: user?.id,
    productKey,
    enabled: enabled && !!effectiveWorkspaceId && !!user?.id,
  });

  const ctx = useMemo(() => {
    if (!effectiveWorkspaceId || !user?.id) return null;

    const isWorkspaceOwner = workspace?.owner_id === user.id;
    const roleId = workspace?.role?.id ?? null;
    const roleKey = workspace?.role?.role_key ?? null;
    const hasModuleAccess =
      isWorkspaceOwner || canAccess(entityType === 'leads' ? 'leads' : entityType, 'view');

    return buildFieldPermissionContext({
      workspaceId: effectiveWorkspaceId,
      entityType,
      productKey,
      userId: user.id,
      roleId,
      roleKey,
      isWorkspaceOwner,
      hasModuleAccess,
      fields: fields as EntityField[],
    });
  }, [
    effectiveWorkspaceId,
    user?.id,
    workspace?.owner_id,
    workspace?.role,
    entityType,
    productKey,
    fields,
    canAccess,
  ]);

  const canView = useMemo(
    () => (fieldKey: string) => (ctx ? canViewField(ctx, fieldKey) : true),
    [ctx],
  );

  const canEdit = useMemo(
    () => (fieldKey: string) => (ctx ? canEditField(ctx, fieldKey) : true),
    [ctx],
  );

  const canViewColumn = useMemo(
    () => (columnId: string) => {
      if (columnId === 'sno') return true;
      const fieldKey = LEAD_COLUMN_TO_FIELD_KEY[columnId] ?? columnId;
      return canView(fieldKey);
    },
    [canView],
  );

  const canEditColumn = useMemo(
    () => (columnId: string) => {
      const fieldKey = LEAD_COLUMN_TO_FIELD_KEY[columnId] ?? columnId;
      return canEdit(fieldKey);
    },
    [canEdit],
  );

  const visibleFields = useMemo(
    () => (ctx ? getVisibleFields(ctx) : []),
    [ctx],
  );

  const editableFields = useMemo(
    () => (ctx ? getEditableFields(ctx) : []),
    [ctx],
  );

  const visibleCustomFields = useMemo(
    () => fields.filter((f) => !f.is_system && canView(f.field_key)),
    [fields, canView],
  );

  const editableCustomFields = useMemo(
    () => fields.filter((f) => !f.is_system && canEdit(f.field_key)),
    [fields, canEdit],
  );

  return {
    ctx,
    productKey,
    isLoading,
    canView,
    canEdit,
    canViewColumn,
    canEditColumn,
    visibleFields,
    editableFields,
    visibleCustomFields,
    editableCustomFields,
    allFields: fields,
  };
}
