import 'server-only';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  getTrialReminderDays,
  getUsageWarningThreshold,
} from './lifecycle-rules';
import { SubscriptionNotificationService } from './notification-service';

export const LIFECYCLE_DAY_MS = 86_400_000;
// Additive billing tables can be ahead of generated database types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LifecycleBillingClient = any;

export class SubscriptionTrialLifecycleJobs {
  protected readonly client = getSupabaseServerAdminClient();
  protected readonly billingClient = this.client as LifecycleBillingClient;
  protected readonly notifications = new SubscriptionNotificationService();

  protected async processTrialReminders(now: Date) {
    const result = await this.client
      .from('workspace_subscriptions')
      .select('id, workspace_id, trial_end_date')
      .eq('subscription_status', 'trial_active')
      .gt('trial_end_date', now.toISOString())
      .lte(
        'trial_end_date',
        new Date(now.getTime() + 8 * LIFECYCLE_DAY_MS).toISOString(),
      );
    if (result.error) throw result.error;
    let sent = 0;
    for (const trial of result.data ?? []) {
      if (!trial.trial_end_date) continue;
      const days = getTrialReminderDays(new Date(trial.trial_end_date), now);
      if (days === null) continue;
      await this.notifications.emitBestEffort({
        workspaceId: trial.workspace_id,
        eventType: 'trial_ending',
        eventKey: `trial_ending:${trial.id}:${trial.trial_end_date}:${days}`,
        title: `Your Growth trial ends in ${days} day${days === 1 ? '' : 's'}`,
        message:
          'Choose a plan before the trial ends. Without an upgrade, selected modules move to Free Forever automatically.',
        email: true,
        metadata: { daysRemaining: days, trialEndDate: trial.trial_end_date },
      });
      sent += 1;
    }
    return sent;
  }

  protected async expireTrials() {
    const result = await this.client.rpc('expire_due_subscription_trials');
    if (result.error) throw result.error;
    for (const row of result.data ?? []) {
      const freeSeats = await this.client
        .from('workspace_module_seats')
        .update({
          status: 'active',
          payment_provider: 'manual',
          provider_customer_id: null,
          provider_subscription_id: null,
          current_period_start: null,
          current_period_end: null,
          trial_ends_at: null,
          provider_metadata: {
            billing_bypassed: true,
            reason: 'free_plan_after_trial',
          },
        })
        .eq('workspace_id', row.workspace_id)
        .eq('status', 'trialing');
      if (freeSeats.error) throw freeSeats.error;
      await this.notifications.emitBestEffort({
        workspaceId: row.workspace_id,
        eventType: 'trial_expired',
        eventKey: `trial_expired:${row.workspace_id}`,
        title: 'Your Growth trial has ended',
        message:
          'Your modules are now on Free Forever. Existing records remain available; Free Forever limits apply to new records.',
        email: true,
      });
    }
    return (result.data ?? []).length;
  }

  protected async applyPendingChanges(now: Date) {
    const due = await this.client
      .from('subscription_changes')
      .select(
        'id, workspace_id, change_type, effective_at, workspace_module_subscriptions(module_id, subscription_products(product_key)), from_plan:plans!subscription_changes_from_plan_id_fkey(plan_name), to_plan:plans!subscription_changes_to_plan_id_fkey(plan_name, is_paid)',
      )
      .eq('status', 'pending')
      .lte('effective_at', now.toISOString());
    if (due.error) throw due.error;
    const applied = await this.client.rpc('apply_due_subscription_changes', {
      p_workspace_id: null,
    });
    if (applied.error) throw applied.error;
    for (const change of due.data ?? []) {
      const isRemoval = change.change_type === 'module_cancel';
      const moduleSubscription = Array.isArray(
        change.workspace_module_subscriptions,
      )
        ? change.workspace_module_subscriptions[0]
        : change.workspace_module_subscriptions;
      const product = Array.isArray(moduleSubscription?.subscription_products)
        ? moduleSubscription.subscription_products[0]
        : moduleSubscription?.subscription_products;
      const target = Array.isArray(change.to_plan)
        ? change.to_plan[0]
        : change.to_plan;
      if (isRemoval && moduleSubscription?.module_id) {
        const seatUpdate = await this.client
          .from('workspace_module_seats')
          .update({ status: 'cancelled', updated_at: now.toISOString() })
          .eq('workspace_id', change.workspace_id)
          .eq('product_id', moduleSubscription.module_id)
          .neq('status', 'expired');
        if (seatUpdate.error) throw seatUpdate.error;
      } else if (target?.is_paid === false && moduleSubscription?.module_id) {
        const freeSeatUpdate = await this.client
          .from('workspace_module_seats')
          .update({
            status: 'active',
            payment_provider: 'manual',
            provider_customer_id: null,
            provider_subscription_id: null,
            current_period_start: null,
            current_period_end: null,
            provider_metadata: { billing_bypassed: true, reason: 'free_plan' },
            updated_at: now.toISOString(),
          })
          .eq('workspace_id', change.workspace_id)
          .eq('product_id', moduleSubscription.module_id);
        if (freeSeatUpdate.error) throw freeSeatUpdate.error;
      }
      if (isRemoval || target?.is_paid === false) {
        const paidModules = await this.client
          .from('workspace_module_subscriptions')
          .select('id, plans!inner(is_paid)')
          .eq('workspace_id', change.workspace_id)
          .eq('status', 'active')
          .eq('plans.is_paid', true)
          .limit(1);
        if (paidModules.error) throw paidModules.error;
        if ((paidModules.data ?? []).length === 0) {
          const freeWorkspace = await this.client
            .from('workspace_subscriptions')
            .update({
              subscription_status: 'free',
              current_period_start: null,
              current_period_end: null,
              updated_at: now.toISOString(),
            })
            .eq('workspace_id', change.workspace_id);
          if (freeWorkspace.error) throw freeWorkspace.error;
        }
      }
      await this.notifications.emitBestEffort({
        workspaceId: change.workspace_id,
        eventType: isRemoval ? 'module_removed' : 'plan_downgrade_applied',
        eventKey: `subscription_change_applied:${change.id}`,
        title: isRemoval
          ? `${product?.product_key ?? 'Module'} removed`
          : `Plan downgrade to ${target?.plan_name ?? 'the scheduled plan'} applied`,
        message: isRemoval
          ? 'The scheduled module removal is complete.'
          : 'The scheduled plan is now active. Existing records remain accessible if usage is above the new limit.',
        email: true,
      });
    }
    return Number(applied.data ?? 0);
  }

  protected async reconcileUsage() {
    const result = await this.client.rpc('reconcile_subscription_usage');
    if (result.error) throw result.error;
    return result.data;
  }

  protected async processUsageWarnings() {
    const counters = await this.client
      .from('usage_counters')
      .select(
        'workspace_id, current_usage, limit_value, feature_catalog(feature_key, feature_name, subscription_products(product_key))',
      )
      .not('limit_value', 'is', null)
      .gt('limit_value', 0);
    if (counters.error) throw counters.error;
    let warnings = 0;
    for (const counter of counters.data ?? []) {
      const threshold = getUsageWarningThreshold(
        counter.current_usage,
        counter.limit_value,
      );
      if (threshold === null) continue;
      const feature = Array.isArray(counter.feature_catalog)
        ? counter.feature_catalog[0]
        : counter.feature_catalog;
      await this.notifications.emitBestEffort({
        workspaceId: counter.workspace_id,
        eventType: threshold === 100 ? 'usage_100' : 'usage_80',
        eventKey: `usage:${counter.workspace_id}:${feature?.feature_key}:${counter.limit_value}:${threshold}`,
        title:
          threshold === 100
            ? `${feature?.feature_name ?? 'Usage'} limit reached`
            : `${feature?.feature_name ?? 'Usage'} is at 80%`,
        message: `You are using ${counter.current_usage} of ${counter.limit_value}. Existing records remain accessible; upgrade or reduce usage to create more.`,
        email: threshold === 100,
        metadata: {
          currentUsage: counter.current_usage,
          limit: counter.limit_value,
        },
      });
      warnings += 1;
    }
    return warnings;
  }
}
