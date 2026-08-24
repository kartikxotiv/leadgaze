import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { SUBSCRIPTION_PERMISSION } from '~/lib/subscriptions/contracts';
import { ApiError } from '~/utils/response-handler';

import { requirePermission } from './rbac';

type SubscriptionPermissionParams = {
  accountId: string;
  workspaceId: string;
};

export async function requireSubscriptionViewPermission(
  params: SubscriptionPermissionParams,
) {
  return requirePermission({
    accountId: params.accountId,
    organizationId: params.workspaceId,
    moduleKey: SUBSCRIPTION_PERMISSION.moduleKey,
    featureKey: SUBSCRIPTION_PERMISSION.view,
    minAccessLevel: 'own',
  });
}

export async function requireSubscriptionManagePermission(
  params: SubscriptionPermissionParams,
) {
  return requirePermission({
    accountId: params.accountId,
    organizationId: params.workspaceId,
    moduleKey: SUBSCRIPTION_PERMISSION.moduleKey,
    featureKey: SUBSCRIPTION_PERMISSION.manage,
    minAccessLevel: 'own',
  });
}

/**
 * Billing mutations require both the billing RBAC feature and workspace
 * ownership. The explicit owner check prevents an accidental custom-role grant
 * from authorizing payments or cancellations.
 */
export async function requireSubscriptionBillingPermission(
  params: SubscriptionPermissionParams,
) {
  const permission = await requirePermission({
    accountId: params.accountId,
    organizationId: params.workspaceId,
    moduleKey: SUBSCRIPTION_PERMISSION.moduleKey,
    featureKey: SUBSCRIPTION_PERMISSION.billing,
    minAccessLevel: 'all',
  });

  const supabase = getSupabaseServerClient();
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', params.workspaceId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!workspace || workspace.owner_id !== params.accountId) {
    throw new ApiError('Only the billing owner can perform this action', 403);
  }

  return {
    ...permission,
    billingOwnerId: workspace.owner_id,
  };
}
