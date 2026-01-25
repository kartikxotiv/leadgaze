/**
 * Permission API Service
 * Fetches permission data from the backend
 */
import { useQuery } from '@tanstack/react-query';

import type {
  Module,
  ModuleFeature,
  PermissionContextData,
  RolePermission,
  WorkspaceRole,
} from './types';

interface PermissionDataResponse {
  data: {
    role: WorkspaceRole;
    permissions: RolePermission[];
    modules: Module[];
    features: ModuleFeature[];
  };
}

/**
 * Fetch all permission data for the current user in a workspace
 */
export async function fetchPermissionData(
  workspaceId: string,
): Promise<PermissionDataResponse> {
  const response = await fetch(`/api/permissions?workspaceId=${workspaceId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch permission data');
  }

  return response.json();
}

/**
 * React Query hook to fetch and cache permission data
 */
export function usePermissionData(workspaceId: string) {
  return useQuery<PermissionDataResponse, Error>({
    queryKey: ['permissions', workspaceId],
    queryFn: () => fetchPermissionData(workspaceId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!workspaceId,
    refetchOnWindowFocus: false,
  });
}

/**
 * Check if a user has access to a feature
 * Used server-side or in API routes
 */
export async function checkUserPermission(
  userId: string,
  workspaceId: string,
  moduleKey: string,
  featureKey: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/permissions/check?workspaceId=${workspaceId}&moduleKey=${moduleKey}&featureKey=${featureKey}`,
      {
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.canAccess === true;
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
}
