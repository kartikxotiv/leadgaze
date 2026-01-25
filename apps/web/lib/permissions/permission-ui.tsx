/**
 * Permission UI Components
 * Convenient components for conditionally rendering based on permissions
 */

'use client';

import React from 'react';

import { usePermissions } from './permission-provider';

/**
 * Permission UI Components
 * Convenient components for conditionally rendering based on permissions
 */

interface IfHasPermissionProps {
  moduleKey: string;
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Conditionally render content based on permission
 * @example
 * <IfHasPermission moduleKey="leads" featureKey="create">
 *   <button>Create Lead</button>
 * </IfHasPermission>
 */
export function IfHasPermission({
  moduleKey,
  featureKey,
  children,
  fallback,
}: IfHasPermissionProps) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(moduleKey, featureKey)) {
    return fallback ?? null;
  }

  return <>{children}</>;
}

interface WithPermissionProps {
  moduleKey: string;
  featureKey: string;
  children: React.ReactNode;
  disabled?: boolean;
}

/**
 * Wrapper component that disables content if permission is not granted
 */
export function WithPermission({
  moduleKey,
  featureKey,
  children,
  disabled = false,
}: WithPermissionProps) {
  const { hasPermission, checkPermissionByKey } = usePermissions();
  const hasAccess = hasPermission(moduleKey, featureKey);
  const permissionResult = checkPermissionByKey(moduleKey, featureKey);

  if (!hasAccess) {
    return <div className="cursor-not-allowed opacity-50">{children}</div>;
  }

  return <>{children}</>;
}

interface PermissionGateProps {
  moduleKey: string;
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Access gate - only render if user has permission
 * Similar to IfHasPermission but with better naming
 */
export function PermissionGate({
  moduleKey,
  featureKey,
  children,
  fallback,
}: PermissionGateProps) {
  return (
    <IfHasPermission
      moduleKey={moduleKey}
      featureKey={featureKey}
      fallback={fallback}
    >
      {children}
    </IfHasPermission>
  );
}

/**
 * Component to display permission denied message
 */
export function PermissionDenied({
  moduleName = 'This feature',
  message = 'You do not have permission to access this feature.',
}: {
  moduleName?: string;
  message?: string;
}) {
  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <p className="text-sm font-medium text-yellow-800">{moduleName}</p>
      <p className="text-sm text-yellow-700">{message}</p>
    </div>
  );
}
