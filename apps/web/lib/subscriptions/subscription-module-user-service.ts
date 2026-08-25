import 'server-only';

import type {
  AssignModuleUserRequest,
  SubscriptionModuleKey,
} from './contracts';
import { SubscriptionApiError } from './errors';
import { SubscriptionChangeService } from './subscription-change-service';
import { asObject } from './subscription-service-base';

type AdditiveRpcClient = {
  rpc: (
    name: string,
    args: Record<string, string>,
  ) => Promise<{ data: unknown; error: Error | null }>;
};

export class SubscriptionModuleUserService extends SubscriptionChangeService {
  async getModuleUsers(workspaceId: string, moduleKey: SubscriptionModuleKey) {
    const productModule = await this.repository.getModule(moduleKey);
    const users = await this.repository.getModuleUsers(
      workspaceId,
      productModule.id,
    );
    return {
      workspaceId,
      moduleKey,
      users: users.map((row) => {
        const account = asObject(row.accounts);
        return {
          userId: row.user_id,
          name: account.name ?? null,
          email: account.email,
          pictureUrl: account.picture_url ?? null,
          status: row.status,
          assignedAt: row.assigned_at,
          removedAt: row.removed_at,
        };
      }),
    };
  }

  async assignModuleUser(input: AssignModuleUserRequest, actorId: string) {
    const productModule = await this.repository.getModule(input.moduleKey);
    const subscription = await this.repository.getModuleSubscription(
      input.workspaceId,
      productModule.id,
    );
    if (!subscription || !['active', 'trial'].includes(subscription.status)) {
      throw new SubscriptionApiError(
        'The module is not active',
        409,
        'CONFLICT',
      );
    }
    await this.repository.assertAcceptedWorkspaceMember(
      input.workspaceId,
      input.userId,
    );
    if (subscription.bundle_id) {
      const result = await (this.client as unknown as AdditiveRpcClient).rpc(
        'assign_backend_bundle_user',
        {
          p_workspace_id: input.workspaceId,
          p_bundle_id: subscription.bundle_id,
          p_user_id: input.userId,
          p_actor_id: actorId,
        },
      );
      if (result.error) throw result.error;
      return { ...input, status: 'active' as const, bundled: true };
    }
    const now = new Date().toISOString();
    const [entitlement, activeUsers, seat] = await Promise.all([
      this.client
        .from('module_entitlements')
        .select('granted_seats')
        .eq('workspace_id', input.workspaceId)
        .eq('product_id', productModule.id)
        .eq('is_active', true)
        .lte('valid_from', now)
        .or(`valid_until.is.null,valid_until.gt.${now}`)
        .maybeSingle(),
      this.client
        .from('workspace_module_users')
        .select('user_id')
        .eq('workspace_id', input.workspaceId)
        .eq('module_id', productModule.id)
        .eq('status', 'active'),
      this.client
        .from('workspace_module_seats')
        .select('seats_purchased')
        .eq('workspace_id', input.workspaceId)
        .eq('product_id', productModule.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle(),
    ]);
    if (entitlement.error) throw entitlement.error;
    if (activeUsers.error) throw activeUsers.error;
    if (seat.error) throw seat.error;
    const alreadyAssigned = (activeUsers.data ?? []).some(
      (row) => row.user_id === input.userId,
    );
    if (!alreadyAssigned) {
      const limit = entitlement.data
        ? entitlement.data.granted_seats
        : seat.data?.seats_purchased;
      if (limit === undefined) {
        throw new SubscriptionApiError(
          'No active seat allocation exists for this module',
          402,
          'PAYMENT_REQUIRED',
          { seatUpgradeRequired: true },
        );
      }
      if (limit !== null && (activeUsers.data ?? []).length >= limit) {
        throw new SubscriptionApiError(
          `All ${limit} module seats are assigned. Increase seats before assigning another user.`,
          402,
          'PAYMENT_REQUIRED',
          { seatUpgradeRequired: true, seatsPurchased: limit },
        );
      }
    }
    const result = await (this.client as unknown as AdditiveRpcClient).rpc(
      'assign_backend_module_user',
      {
        p_workspace_id: input.workspaceId,
        p_module_id: productModule.id,
        p_user_id: input.userId,
        p_actor_id: actorId,
      },
    );
    if (result.error) throw result.error;
    return { ...input, status: 'active' as const };
  }

  async removeModuleUser(input: AssignModuleUserRequest, actorId?: string) {
    const productModule = await this.repository.getModule(input.moduleKey);
    const subscription = await this.repository.getModuleSubscription(
      input.workspaceId,
      productModule.id,
    );
    if (subscription?.bundle_id) {
      const result = await (this.client as unknown as AdditiveRpcClient).rpc(
        'remove_backend_bundle_user',
        {
          p_workspace_id: input.workspaceId,
          p_bundle_id: subscription.bundle_id,
          p_user_id: input.userId,
          p_actor_id: actorId ?? input.userId,
        },
      );
      if (result.error) throw result.error;
      if (!result.data) {
        throw new SubscriptionApiError(
          'Bundle user assignment not found',
          404,
          'NOT_FOUND',
        );
      }
      return { ...input, status: 'removed' as const, bundled: true };
    }
    const result = await this.client
      .from('workspace_module_users')
      .update({ status: 'removed', removed_at: new Date().toISOString() })
      .eq('workspace_id', input.workspaceId)
      .eq('module_id', productModule.id)
      .eq('user_id', input.userId)
      .eq('status', 'active')
      .select('id')
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) {
      throw new SubscriptionApiError(
        'Module user assignment not found',
        404,
        'NOT_FOUND',
      );
    }
    const legacyAssignment = await this.client
      .from('seat_assignments')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: actorId ?? null,
      })
      .eq('workspace_id', input.workspaceId)
      .eq('product_id', productModule.id)
      .eq('user_id', input.userId)
      .eq('is_active', true);
    if (legacyAssignment.error) throw legacyAssignment.error;
    return { ...input, status: 'removed' as const };
  }
}
