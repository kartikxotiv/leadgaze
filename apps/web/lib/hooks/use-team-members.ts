'use client';

import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getTeamMembersByProduct } from '~/services/workspace-init.service';
import { getSeatAssignmentsService } from '~/services/subscription.service';
import { getMembersService } from '~/services/team-members.service';
import type { WorkspaceMember as ServiceWorkspaceMember } from '~/services/team-members.service';
import type { WorkspaceMember as InitWorkspaceMember } from '~/services/workspace-init.service';

interface UseTeamMembersOptions {
  workspaceId?: string;
  /** Product key (e.g. sales, service_cloud) — when set, only members with an active seat in that product are returned. */
  productKey?: string;
  enabled?: boolean;
  /** If true, forces fresh API call instead of using cached workspace data */
  forceFresh?: boolean;
}

export function useTeamMembers({
  workspaceId,
  productKey: rawProductKey,
  enabled = true,
  forceFresh = false,
}: UseTeamMembersOptions) {
  const productKey = rawProductKey === 'service-cloud' ? 'service_cloud' : rawProductKey;
  const { currentWorkspace, isInitialized, isLoading: rbacLoading } = useRBAC();
  
  // **OPTIMIZED: Use workspace initialization data if available**
  const shouldUseOptimizedData = !forceFresh && 
    isInitialized && 
    currentWorkspace?.id === workspaceId;

  // Legacy API call (fallback for non-current workspace or forced refresh)
  const membersQuery = useQuery({
    queryKey: ['team-members', workspaceId, productKey],
    queryFn: async () => {
      if (!workspaceId) return { data: [] as ServiceWorkspaceMember[] };
      const response = await getMembersService(workspaceId, productKey);
      return response as { data: ServiceWorkspaceMember[] };
    },
    enabled: enabled && !!workspaceId && !shouldUseOptimizedData && !rbacLoading,
  });

  const seatAssignmentsQuery = useQuery({
    queryKey: ['module-seat-assignments', workspaceId, productKey],
    queryFn: () => getSeatAssignmentsService(workspaceId!, productKey),
    enabled: enabled && !!workspaceId && !!productKey && !shouldUseOptimizedData && !rbacLoading,
  });

  // **OPTIMIZED: Get team members from workspace initialization data**
  const optimizedMembersQuery = useQuery({
    queryKey: ['workspace-init', 'team-members', currentWorkspace?.id, productKey],
    queryFn: () => {
      // This is a synchronous operation using already-loaded data
      const cachedData = JSON.parse(
        sessionStorage.getItem(`workspace-${currentWorkspace?.id}-init`) || '{}'
      );
      
      if (cachedData?.current_workspace?.team_members) {
        return {
          data: getTeamMembersByProduct(
            cachedData.current_workspace.team_members,
            productKey
          )
        };
      }
      
      // Fallback to making API call if cached data not found
      return getMembersService(workspaceId || '', productKey);
    },
    enabled: enabled && shouldUseOptimizedData,
    staleTime: 5 * 60 * 1000, // Use cached data for 5 minutes
  });

  // Use optimized data when available, otherwise fallback to legacy
  const activeQuery = shouldUseOptimizedData ? optimizedMembersQuery : membersQuery;

  const filteredData = useMemo(() => {
    const allMembers = activeQuery.data?.data ?? [];
    const seen = new Set<string>();
    const uniqueMembers = allMembers.filter((m: InitWorkspaceMember | ServiceWorkspaceMember) => {
      if (!m.user_id) return true;
      if (seen.has(m.user_id)) return false;
      seen.add(m.user_id);
      return true;
    });

    if (!productKey) {
      return uniqueMembers.filter((m: InitWorkspaceMember | ServiceWorkspaceMember) => 
        m.status !== 'removed'
      );
    }

    // For optimized data, product filtering is already done by getTeamMembersByProduct
    if (shouldUseOptimizedData) {
      return uniqueMembers.filter((m: InitWorkspaceMember | ServiceWorkspaceMember) => 
        m.status !== 'removed'
      );
    }

    // Legacy seat assignment filtering (only for non-optimized path)
    const assignments = seatAssignmentsQuery.data?.data ?? [];
    const activeUserIds = new Set(
      assignments
        .filter((a: { is_active?: boolean }) => a.is_active)
        .map((a: { user_id: string }) => a.user_id),
    );

    return uniqueMembers.filter(
      (m: InitWorkspaceMember | ServiceWorkspaceMember) =>
        m.status !== 'removed' &&
        (m.status === 'pending' || activeUserIds.has(m.user_id)),
    );
  }, [activeQuery.data, seatAssignmentsQuery.data, productKey, shouldUseOptimizedData]);

  return {
    ...activeQuery,
    data: { data: filteredData },
    isLoading: shouldUseOptimizedData 
      ? optimizedMembersQuery.isLoading
      : (membersQuery.isLoading || (!!productKey && seatAssignmentsQuery.isLoading)),
    isOptimized: shouldUseOptimizedData,
  };
}
