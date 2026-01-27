/**
 * Permission Provider Wrapper
 * Bridges RBAC context with Permission system
 * Only loads permissions when inside a workspace context
 */
'use client';

import { ReactNode } from 'react';

import { PermissionProvider, usePermissions } from '~/lib/permissions';
import { useRBAC } from '~/lib/rbac/rbac-provider';

/**
 * Permission Provider Wrapper
 * Bridges RBAC context with Permission system
 * Only loads permissions when inside a workspace context
 */

/**
 * Permission Provider Wrapper
 * Bridges RBAC context with Permission system
 * Only loads permissions when inside a workspace context
 */

/**
 * Permission Provider Wrapper
 * Bridges RBAC context with Permission system
 * Only loads permissions when inside a workspace context
 */

/**
 * Inner component that uses both RBAC and PermissionProvider
 */
function PermissionProviderWrapper({ children }: { children: ReactNode }) {
  const { currentWorkspace } = useRBAC();

  return (
    <PermissionProvider workspaceId={currentWorkspace?.id ?? ''}>
      {children}
    </PermissionProvider>
  );
}

export { PermissionProviderWrapper };
