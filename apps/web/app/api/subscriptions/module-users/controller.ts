import type { NextRequest } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { requireSubscriptionManagePermission } from '~/lib/server/subscription-permissions';
import {
  type RouteUser,
  parseInput,
  parseJson,
  requireRouteUser,
  success,
} from '~/lib/subscriptions/api';
import {
  assignModuleUserRequestSchema,
  moduleUsersQuerySchema,
  removeModuleUserQuerySchema,
} from '~/lib/subscriptions/contracts';
import { createSubscriptionService } from '~/lib/subscriptions/service';
import { catchAsync } from '~/utils/response-handler';

const service = () =>
  createSubscriptionService(getSupabaseServerAdminClient() as never);

export const getModuleUsers = catchAsync(
  async ({ request, user }: { request: NextRequest; user?: RouteUser }) => {
    const actor = requireRouteUser(user);
    const input = parseInput(moduleUsersQuerySchema, {
      workspaceId: request.nextUrl.searchParams.get('workspaceId'),
      moduleKey: request.nextUrl.searchParams.get('moduleKey'),
    });
    await requireSubscriptionManagePermission({
      accountId: actor.id,
      workspaceId: input.workspaceId,
    });
    return success(
      await service().getModuleUsers(input.workspaceId, input.moduleKey),
    );
  },
);

export const assignModuleUser = catchAsync(
  async ({ request, user }: { request: NextRequest; user?: RouteUser }) => {
    const actor = requireRouteUser(user);
    const input = await parseJson(request, assignModuleUserRequestSchema);
    await requireSubscriptionManagePermission({
      accountId: actor.id,
      workspaceId: input.workspaceId,
    });
    return success(await service().assignModuleUser(input, actor.id));
  },
);

export const removeModuleUser = catchAsync(
  async ({ request, user }: { request: NextRequest; user?: RouteUser }) => {
    const actor = requireRouteUser(user);
    const input = parseInput(removeModuleUserQuerySchema, {
      workspaceId: request.nextUrl.searchParams.get('workspaceId'),
      moduleKey: request.nextUrl.searchParams.get('moduleKey'),
      userId: request.nextUrl.searchParams.get('userId'),
    });
    await requireSubscriptionManagePermission({
      accountId: actor.id,
      workspaceId: input.workspaceId,
    });
    return success(await service().removeModuleUser(input, actor.id));
  },
);
