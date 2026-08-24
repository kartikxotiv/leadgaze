import 'server-only';

import type {
  AssignModuleUserRequest,
  SubscriptionModuleKey,
} from './contracts';
import { SubscriptionApiError } from './errors';
import { SubscriptionChangeService } from './subscription-change-service';
import { asObject } from './subscription-service-base';

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
    const result = await this.client.from('workspace_module_users').upsert(
      {
        workspace_id: input.workspaceId,
        module_id: productModule.id,
        user_id: input.userId,
        status: 'active',
        assigned_by: actorId,
        assigned_at: new Date().toISOString(),
        removed_at: null,
      },
      { onConflict: 'workspace_id,user_id,module_id' },
    );
    if (result.error) throw result.error;
    return { ...input, status: 'active' as const };
  }

  async removeModuleUser(input: AssignModuleUserRequest) {
    const productModule = await this.repository.getModule(input.moduleKey);
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
    return { ...input, status: 'removed' as const };
  }
}
