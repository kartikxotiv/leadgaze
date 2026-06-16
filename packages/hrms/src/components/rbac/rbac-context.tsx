'use client';

import { useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';

type AccessLevel = 'none' | 'own' | 'team' | 'all';

type RbacPermission = {
  module_key: string;
  feature_key: string;
  can_access: boolean;
  access_level: AccessLevel;
};

type RbacSnapshotResponse = {
  success: boolean;
  data?: {
    employeeId?: string | null;
    roleKeys?: string[];
    permissions?: RbacPermission[];
  };
};

const accessRank: Record<AccessLevel, number> = {
  none: 0,
  own: 1,
  team: 2,
  all: 3,
};

export function useRbac() {
  const query = useQuery({
    queryKey: ['hrms', 'rbac', 'me'],
    queryFn: async () => {
      const response = await fetch('/api/hrms/rbac/me');

      if (!response.ok) {
        return { success: false, data: { permissions: [] } };
      }

      return (await response.json()) as RbacSnapshotResponse;
    },
    staleTime: 60_000,
  });

  const permissions = query.data?.data?.permissions ?? [];

  const hasPermission = useCallback(
    (
      moduleKey: string,
      featureKey = 'view',
      minAccessLevel: AccessLevel = 'own',
    ) => {
      const moduleKeys = [
        moduleKey,
        moduleKey.startsWith('hrms_')
          ? moduleKey.replace(/^hrms_/, '')
          : `hrms_${moduleKey}`,
      ];
      const featureKeys = getFeatureAliases(moduleKey, featureKey);

      const permission = permissions.find(
        (item) =>
          moduleKeys.includes(item.module_key) &&
          featureKeys.includes(item.feature_key) &&
          item.can_access,
      );

      if (!permission) {
        return false;
      }

      return accessRank[permission.access_level] >= accessRank[minAccessLevel];
    },
    [permissions],
  );

  return {
    hasPermission,
    isAdmin: Boolean(query.data?.data?.roleKeys?.includes('admin')),
    isLoading: query.isLoading,
    snapshot: query.data?.data ?? null,
  };
}

function getFeatureAliases(moduleKey: string, featureKey: string) {
  if (moduleKey === 'leave' || moduleKey === 'hrms_leave') {
    if (featureKey === 'create') {
      return ['create', 'request', 'apply'];
    }

    if (featureKey === 'approve') {
      return ['approve', 'approve_requests'];
    }
  }

  if (moduleKey === 'attendance' || moduleKey === 'hrms_attendance') {
    if (featureKey === 'log') {
      return ['log', 'check_in', 'check_out'];
    }

    if (featureKey === 'create') {
      return ['create', 'manage', 'shifts'];
    }
  }

  return [featureKey];
}
