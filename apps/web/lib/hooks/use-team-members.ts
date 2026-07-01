'use client';

import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { getSeatAssignmentsService } from '~/services/subscription.service';
import { getMembersService } from '~/services/team-members.service';
import type { WorkspaceMember } from '~/services/team-members.service';

interface UseTeamMembersOptions {
  workspaceId?: string;
  /** Product key (e.g. sales, service_cloud) — when set, only members with an active seat in that product are returned. */
  productKey?: string;
  enabled?: boolean;
}

export function useTeamMembers({
  workspaceId,
  productKey,
  enabled = true,
}: UseTeamMembersOptions) {
  const membersQuery = useQuery({
    queryKey: ['team-members', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { data: [] as WorkspaceMember[] };
      const response = await getMembersService(workspaceId);
      return response as { data: WorkspaceMember[] };
    },
    enabled: enabled && !!workspaceId,
  });

  const seatAssignmentsQuery = useQuery({
    queryKey: ['module-seat-assignments', workspaceId, productKey],
    queryFn: () => getSeatAssignmentsService(workspaceId!, productKey),
    enabled: enabled && !!workspaceId && !!productKey,
  });

  const filteredData = useMemo(() => {
    const allMembers = membersQuery.data?.data ?? [];

    if (!productKey) {
      return allMembers.filter((m) => m.status !== 'removed');
    }

    const assignments = seatAssignmentsQuery.data?.data ?? [];
    const activeUserIds = new Set(
      assignments
        .filter((a: { is_active?: boolean }) => a.is_active)
        .map((a: { user_id: string }) => a.user_id),
    );

    return allMembers.filter(
      (m) =>
        m.status !== 'removed' &&
        (m.status === 'pending' || activeUserIds.has(m.user_id)),
    );
  }, [membersQuery.data, seatAssignmentsQuery.data, productKey]);

  return {
    ...membersQuery,
    data: { data: filteredData },
    isLoading:
      membersQuery.isLoading ||
      (!!productKey && seatAssignmentsQuery.isLoading),
  };
}
