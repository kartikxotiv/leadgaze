import 'server-only';

import { requirePermission } from './rbac';

export async function requireSubscriptionManagePermission(params: {
  accountId: string;
  workspaceId: string;
}) {
  return requirePermission({
    accountId: params.accountId,
    organizationId: params.workspaceId,
    moduleKey: 'subscription',
    featureKey: 'manage',
    minAccessLevel: 'own',
  });
}
