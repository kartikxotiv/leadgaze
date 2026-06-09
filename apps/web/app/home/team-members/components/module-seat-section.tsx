'use client';

import { useMemo } from 'react';

import { usePathname } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { Check, Loader2, Shield, ShieldOff } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getModuleKeyFromPath } from '~/lib/rbac/route-module-map';
import {
  type SeatAssignment,
  type WorkspaceSeat,
  getSeatAssignmentsService,
  getWorkspaceSeatsService,
} from '~/services/subscription.service';
import {
  type WorkspaceMember,
  getMembersService,
} from '~/services/team-members.service';

const MODULE_LABELS: Record<string, string> = {
  sales: 'Sales CRM',
  hrms: 'HRMS',
  inventory: 'Inventory',
  service_cloud: 'Service Cloud',
  funds: 'Fundraising',
};

const MODULE_COLORS: Record<string, string> = {
  sales: '#0176d3',
  hrms: '#9050dd',
  inventory: '#2e844a',
  service_cloud: '#dd7a01',
  funds: '#0b7764',
};

/**
 * ModuleSeatSection — Read-only display of seat assignments for the
 * current module on the team-members page.
 *
 * Seat allocation is fully automatic:
 *  - When a member joins the workspace, seats are auto-assigned for all active modules.
 *  - When a member is removed, all their seats are auto-revoked.
 *
 * This component simply shows the current seat status per member.
 */
export function ModuleSeatSection() {
  const { currentWorkspace } = useRBAC();
  const pathname = usePathname();
  const workspaceId = currentWorkspace?.id ?? '';
  const productKey = getModuleKeyFromPath(pathname);
  const moduleLabel = MODULE_LABELS[productKey] ?? productKey;
  const moduleColor = MODULE_COLORS[productKey] ?? '#6b7280';

  // Fetch workspace seats to check if module is subscribed
  const { data: seatsData } = useQuery({
    queryKey: ['workspace-seats', workspaceId],
    queryFn: () => getWorkspaceSeatsService(workspaceId),
    enabled: !!workspaceId,
  });

  const seats: WorkspaceSeat[] = seatsData?.data ?? [];
  const moduleSeat = seats.find(
    (s) => s.subscription_products?.product_key === productKey,
  );

  // Fetch seat assignments for this module
  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: ['seat-assignments', workspaceId, productKey],
    queryFn: () => getSeatAssignmentsService(workspaceId, productKey),
    enabled: !!workspaceId && !!productKey,
  });

  // Fetch all workspace members
  const { data: membersData } = useQuery({
    queryKey: ['workspaceMembers', workspaceId],
    queryFn: () => getMembersService(workspaceId),
    enabled: !!workspaceId,
  });

  const allMembers: WorkspaceMember[] = (membersData?.data ?? []).filter(
    (m: WorkspaceMember) => m.status === 'accepted',
  );

  const assignments: SeatAssignment[] = (assignmentsData?.data ?? []).filter(
    (a: SeatAssignment) => a.is_active,
  );

  const assignedUserIds = useMemo(
    () => new Set(assignments.map((a) => a.user_id)),
    [assignments],
  );

  // No subscription for this module
  if (!moduleSeat) {
    return null;
  }

  return (
    <Card className="flex flex-col border-none shadow-none">
      <CardHeader className="shrink-0 p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{
                backgroundColor: `${moduleColor}15`,
                color: moduleColor,
              }}
            >
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">
                {moduleLabel} — Seat Access
              </CardTitle>
              <CardDescription>
                {moduleSeat.seats_used} / {moduleSeat.seats_purchased} seats
                assigned
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-[10px]"
            style={{
              borderColor: `${moduleColor}40`,
              color: moduleColor,
            }}
          >
            {moduleSeat.status === 'trialing' ? 'Trial' : moduleSeat.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : allMembers.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No accepted team members yet.
          </p>
        ) : (
          <div className="space-y-1">
            {allMembers.map((member) => {
              const hasSeat = assignedUserIds.has(member.user_id);

              return (
                <div
                  key={member.id}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-md px-3 py-2.5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold">
                      {(member.user?.email?.charAt(0) || 'M').toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {member.user?.user_metadata?.full_name || 'Team Member'}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {member.user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasSeat ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-green-500/30 text-[10px] text-green-600"
                      >
                        <Check className="h-3 w-3" />
                        Assigned
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground gap-1 text-[10px]"
                      >
                        <ShieldOff className="h-3 w-3" />
                        No Seat
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}

            <p className="text-muted-foreground mt-3 text-center text-[11px]">
              Seats are automatically assigned when members join and revoked
              when they are removed.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
