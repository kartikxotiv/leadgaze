'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Progress } from '@kit/ui/progress';

import { UsageLimitBanner } from '~/components/entitlements/usage-limit-banner';
import { useEntitlements } from '~/lib/entitlements/entitlement-provider';
import type { EntitlementModuleKey } from '~/lib/entitlements/types';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  assignModuleUserService,
  getModuleUsersService,
  removeModuleUserService,
} from '~/services/pricing-subscription.service';

const titleCase = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export function UsageSummary({
  moduleKey,
}: {
  moduleKey: EntitlementModuleKey;
}) {
  const { contexts } = useEntitlements();
  const features = Object.entries(contexts[moduleKey]?.features ?? {}).filter(
    ([, feature]) => feature.limitType === 'numeric',
  );
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Usage</p>
      {features
        .filter(([, feature]) => feature.isNearLimit)
        .map(([key]) => (
          <UsageLimitBanner
            key={key}
            moduleKey={moduleKey}
            featureKey={key}
            label={titleCase(key.split('.').at(-1) ?? key)}
          />
        ))}
      {features.slice(0, 5).map(([key, feature]) => {
        const percentage =
          feature.limitValue === null
            ? 0
            : Math.min(
                100,
                (feature.currentUsage / Math.max(1, feature.limitValue)) * 100,
              );
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{titleCase(key.split('.').at(-1) ?? key)}</span>
              <span>
                {feature.currentUsage} / {feature.limitValue ?? 'Unlimited'}
              </span>
            </div>
            <Progress value={percentage} />
          </div>
        );
      })}
    </div>
  );
}

export function ModuleUsers({
  workspaceId,
  moduleKey,
  canManage,
}: {
  workspaceId: string;
  moduleKey: EntitlementModuleKey;
  canManage: boolean;
}) {
  const { teamMembers } = useRBAC();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['module-users', workspaceId, moduleKey],
    queryFn: () => getModuleUsersService(workspaceId, moduleKey),
  });
  const assignedIds = new Set(
    (query.data?.users ?? [])
      .filter((user: { status: string }) => user.status === 'active')
      .map((user: { userId: string }) => user.userId),
  );
  const available = (teamMembers ?? []).filter(
    (member) => !assignedIds.has(String(member.user_id ?? member.id)),
  );
  const mutate = useMutation({
    mutationFn: (input: { userId: string; remove?: boolean }) =>
      input.remove
        ? removeModuleUserService({
            workspaceId,
            moduleKey,
            userId: input.userId,
          })
        : assignModuleUserService({
            workspaceId,
            moduleKey,
            userId: input.userId,
          }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['module-users', workspaceId, moduleKey],
      }),
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4" />
        <p className="text-sm font-medium">Module users</p>
      </div>
      {(query.data?.users ?? [])
        .filter((user: { status: string }) => user.status === 'active')
        .map((user: { userId: string; name: string | null; email: string }) => (
          <div key={user.userId} className="flex items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate">
              {user.name ?? user.email}
            </span>
            {canManage && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  mutate.mutate({ userId: user.userId, remove: true })
                }
              >
                Remove
              </Button>
            )}
          </div>
        ))}
      {canManage && available.length > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const member = available[0];
            if (member) {
              mutate.mutate({ userId: String(member.user_id ?? member.id) });
            }
          }}
        >
          <UserPlus className="mr-1 h-4 w-4" /> Assign{' '}
          {available[0]?.name ?? 'user'}
        </Button>
      )}
    </div>
  );
}
