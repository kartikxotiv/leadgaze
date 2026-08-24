import 'server-only';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  getTrialReminderDays,
  getUsageWarningThreshold,
} from './lifecycle-rules';
import { SubscriptionNotificationService } from './notification-service';
import { StripeSubscriptionProvider } from './stripe-provider';
import { synchronizeStripeSubscription } from './stripe-sync';

const DAY_MS = 86_400_000;

export class SubscriptionLifecycleJob {
  private readonly client = getSupabaseServerAdminClient();
  private readonly notifications = new SubscriptionNotificationService();
  private readonly stripe = new StripeSubscriptionProvider();

  async run(now = new Date()) {
    const reminders = await this.processTrialReminders(now);
    const expired = await this.expireTrials();
    const changes = await this.applyPendingChanges(now);
    const reconciliation = await this.reconcileUsage();
    const usageWarnings = await this.processUsageWarnings();
    const providerSync = await this.synchronizePaymentState();

    return {
      reminders,
      expired,
      changes,
      reconciliation,
      usageWarnings,
      providerSync,
    };
  }

  private async processTrialReminders(now: Date) {
    const result = await this.client
      .from('workspace_subscriptions')
      .select('id, workspace_id, trial_end_date')
      .eq('subscription_status', 'trial_active')
      .gt('trial_end_date', now.toISOString())
      .lte(
        'trial_end_date',
        new Date(now.getTime() + 8 * DAY_MS).toISOString(),
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

  private async expireTrials() {
    const result = await this.client.rpc('expire_due_subscription_trials');
    if (result.error) throw result.error;
    for (const row of result.data ?? []) {
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

  private async applyPendingChanges(now: Date) {
    const due = await this.client
      .from('subscription_changes')
      .select(
        'id, workspace_id, change_type, effective_at, workspace_module_subscriptions(module_id, subscription_products(product_key)), from_plan:plans!subscription_changes_from_plan_id_fkey(plan_name), to_plan:plans!subscription_changes_to_plan_id_fkey(plan_name)',
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

  private async reconcileUsage() {
    const result = await this.client.rpc('reconcile_subscription_usage');
    if (result.error) throw result.error;
    return result.data;
  }

  private async processUsageWarnings() {
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

  private async synchronizePaymentState() {
    const rows = await this.client
      .from('workspace_billing_subscriptions')
      .select('workspace_id, provider_subscription_id')
      .order('updated_at', { ascending: true })
      .limit(100);
    if (rows.error) throw rows.error;
    let synchronized = 0;
    let failed = 0;
    for (const row of rows.data ?? []) {
      try {
        const subscription = await this.stripe.retrieveSubscription(
          row.provider_subscription_id,
        );
        const result = await synchronizeStripeSubscription({
          client: this.client,
          subscription,
        });
        synchronized += 1;
        if (
          ['past_due', 'unpaid', 'incomplete'].includes(result.providerStatus)
        ) {
          await this.notifications.emitBestEffort({
            workspaceId: row.workspace_id,
            eventType: 'payment_failed',
            eventKey: `payment_failed:${row.provider_subscription_id}:${result.providerStatus}`,
            title: 'Subscription payment needs attention',
            message:
              'Stripe could not complete the latest payment. Update the payment method to avoid interruption.',
            email: true,
          });
        }
      } catch (error) {
        failed += 1;
        console.error('[SubscriptionLifecycle] Stripe sync failed', {
          providerSubscriptionId: row.provider_subscription_id,
          error,
        });
      }
    }
    return { synchronized, failed };
  }
}
