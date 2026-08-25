import 'server-only';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { BackendBillingService } from './backend-billing-service';
import {
  getTrialReminderDays,
  getUsageWarningThreshold,
} from './lifecycle-rules';
import { SubscriptionNotificationService } from './notification-service';
import { RazorpayInvoiceProvider } from './razorpay-provider';

const DAY_MS = 86_400_000;
// New additive billing tables are available before generated database types
// are refreshed in the deployment pipeline.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LifecycleBillingClient = any;

export class SubscriptionLifecycleJob {
  private readonly client = getSupabaseServerAdminClient();
  private readonly billingClient = this.client as LifecycleBillingClient;
  private readonly notifications = new SubscriptionNotificationService();
  private readonly razorpay = new RazorpayInvoiceProvider();

  async run(now = new Date()) {
    const reminders = await this.processTrialReminders(now);
    const expired = await this.expireTrials();
    const changes = await this.applyPendingChanges(now);
    const reconciliation = await this.reconcileUsage();
    const usageWarnings = await this.processUsageWarnings();
    const seatChanges = await this.applyBackendSeatChanges(now);
    const invoiceReminders = await this.processInvoiceReminders(now);
    const renewals = await this.createRenewalInvoices(now);
    const invoiceExpiry = await this.expireBackendInvoices(now);
    const entitlementExpiry = await this.expireEntitlements(now);
    const subscriptionExpiry = await this.processSubscriptionExpiry(now);
    const emailRetries = await this.notifications.retryPendingEmails();
    const providerSync = await this.synchronizePaymentState();

    return {
      reminders,
      expired,
      changes,
      reconciliation,
      usageWarnings,
      seatChanges,
      invoiceReminders,
      renewals,
      invoiceExpiry,
      entitlementExpiry,
      subscriptionExpiry,
      emailRetries,
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

  private async applyPendingChanges(now: Date) {
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
    const rows = await this.billingClient
      .from('backend_billing_invoices')
      .select('id, workspace_id, razorpay_invoice_id')
      .eq('status', 'issued')
      .not('razorpay_invoice_id', 'is', null)
      .order('updated_at', { ascending: true })
      .limit(100);
    if (rows.error) throw rows.error;
    let synchronized = 0;
    let failed = 0;
    for (const row of rows.data ?? []) {
      try {
        const remote = await this.razorpay.fetchInvoice(
          row.razorpay_invoice_id,
        );
        if (remote.status === 'paid') {
          await new BackendBillingService(
            this.client,
            this.razorpay,
          ).markInvoicePaid({ razorpayInvoiceId: row.razorpay_invoice_id });
        } else if (['expired', 'cancelled'].includes(remote.status)) {
          await this.billingClient
            .from('backend_billing_invoices')
            .update({ status: remote.status })
            .eq('id', row.id)
            .eq('status', 'issued');
          await this.billingClient
            .from('backend_seat_changes')
            .update({
              status: 'failed',
              processing_error: `Razorpay invoice ${remote.status}`,
            })
            .eq('invoice_id', row.id)
            .eq('status', 'awaiting_payment');
        }
        synchronized += 1;
      } catch (error) {
        failed += 1;
        console.error('[SubscriptionLifecycle] Razorpay invoice sync failed', {
          invoiceId: row.id,
          error,
        });
      }
    }
    return { synchronized, failed };
  }

  private async applyBackendSeatChanges(now: Date) {
    const result = await this.billingClient.rpc(
      'apply_due_backend_seat_changes',
      { p_now: now.toISOString() },
    );
    if (result.error) throw result.error;
    for (const change of result.data ?? []) {
      await this.notifications.emitBestEffort({
        workspaceId: change.workspace_id,
        eventType: 'seat_decrease_applied',
        eventKey: `seat_decrease_applied:${change.change_id}`,
        title: 'Seat reduction applied',
        message: `The module now has ${change.seats_after} purchased seats.`,
        email: true,
      });
    }
    return (result.data ?? []).length;
  }

  private async processInvoiceReminders(now: Date) {
    const end = new Date(now.getTime() + 4 * DAY_MS);
    const result = await this.billingClient
      .from('backend_billing_invoices')
      .select('id, workspace_id, invoice_number, due_at, payment_url')
      .eq('status', 'issued')
      .gt('due_at', now.toISOString())
      .lte('due_at', end.toISOString());
    if (result.error) throw result.error;
    let sent = 0;
    for (const invoice of result.data ?? []) {
      const days = Math.max(
        1,
        Math.ceil(
          (new Date(invoice.due_at).getTime() - now.getTime()) / DAY_MS,
        ),
      );
      if (![3, 1].includes(days)) continue;
      await this.notifications.emitBestEffort({
        workspaceId: invoice.workspace_id,
        eventType: 'payment_reminder',
        eventKey: `payment_reminder:${invoice.id}:${days}`,
        title: `Invoice ${invoice.invoice_number} is due in ${days} day${days === 1 ? '' : 's'}`,
        message:
          'Complete payment to activate or renew the requested subscription.',
        email: true,
        actionUrl: invoice.payment_url,
        actionLabel: 'Pay invoice',
      });
      sent += 1;
    }
    return sent;
  }

  private async createRenewalInvoices(now: Date) {
    const leadDays = Math.max(
      1,
      Number(process.env.BILLING_RENEWAL_INVOICE_DAYS ?? 7),
    );
    const end = new Date(now.getTime() + leadDays * DAY_MS);
    const seats = await this.billingClient
      .from('workspace_module_seats')
      .select(
        'id, workspace_id, product_id, seats_purchased, billing_cycle, current_period_end, subscription_products(product_key), workspaces(owner_id, accounts!workspaces_owner_id_fkey(email))',
      )
      .eq('status', 'active')
      .gt('current_period_end', now.toISOString())
      .lte('current_period_end', end.toISOString());
    if (seats.error) throw seats.error;
    let created = 0;
    let skipped = 0;
    const processedBundles = new Set<string>();
    for (const seat of seats.data ?? []) {
      try {
        const moduleSubscription = await this.billingClient
          .from('workspace_module_subscriptions')
          .select('id, bundle_id, plans(plan_key), bundles(bundle_key)')
          .eq('workspace_id', seat.workspace_id)
          .eq('module_id', seat.product_id)
          .eq('status', 'active')
          .maybeSingle();
        if (moduleSubscription.error || !moduleSubscription.data) {
          skipped += 1;
          continue;
        }
        const product = Array.isArray(seat.subscription_products)
          ? seat.subscription_products[0]
          : seat.subscription_products;
        const plan = Array.isArray(moduleSubscription.data.plans)
          ? moduleSubscription.data.plans[0]
          : moduleSubscription.data.plans;
        const bundle = Array.isArray(moduleSubscription.data.bundles)
          ? moduleSubscription.data.bundles[0]
          : moduleSubscription.data.bundles;
        const workspace = Array.isArray(seat.workspaces)
          ? seat.workspaces[0]
          : seat.workspaces;
        const account = Array.isArray(workspace?.accounts)
          ? workspace.accounts[0]
          : workspace?.accounts;
        if (!product?.product_key || !plan?.plan_key || !workspace?.owner_id) {
          skipped += 1;
          continue;
        }
        if (moduleSubscription.data.bundle_id) {
          if (!bundle?.bundle_key) {
            skipped += 1;
            continue;
          }
          const bundleRunKey = `${seat.workspace_id}:${moduleSubscription.data.bundle_id}:${seat.current_period_end}`;
          if (processedBundles.has(bundleRunKey)) continue;
          processedBundles.add(bundleRunKey);

          await new BackendBillingService(this.client).createBundleInvoice({
            workspaceId: seat.workspace_id,
            bundleKey: bundle.bundle_key,
            billingCycle: seat.billing_cycle,
            seats: seat.seats_purchased,
            purpose: 'bundle_renewal',
            actor: { id: workspace.owner_id, email: account?.email },
            idempotencyKey: `bundle_renewal:${seat.workspace_id}:${moduleSubscription.data.bundle_id}:${seat.current_period_end}:${seat.seats_purchased}`,
            periodStart: new Date(seat.current_period_end),
            dueAt: new Date(seat.current_period_end),
          });
          created += 1;
          continue;
        }
        const [pendingSeatChange, pendingPlanChange] = await Promise.all([
          this.billingClient
            .from('backend_seat_changes')
            .select('seats_after')
            .eq('workspace_id', seat.workspace_id)
            .eq('module_id', seat.product_id)
            .eq('status', 'scheduled')
            .lte('effective_at', seat.current_period_end)
            .maybeSingle(),
          this.billingClient
            .from('subscription_changes')
            .select(
              'to_plan:plans!subscription_changes_to_plan_id_fkey(plan_key)',
            )
            .eq('workspace_module_subscription_id', moduleSubscription.data.id)
            .eq('change_type', 'plan_downgrade')
            .eq('status', 'pending')
            .lte('effective_at', seat.current_period_end)
            .maybeSingle(),
        ]);
        if (pendingSeatChange.error) throw pendingSeatChange.error;
        if (pendingPlanChange.error) throw pendingPlanChange.error;
        const pendingPlan = Array.isArray(pendingPlanChange.data?.to_plan)
          ? pendingPlanChange.data.to_plan[0]
          : pendingPlanChange.data?.to_plan;
        await new BackendBillingService(this.client).createPlanInvoice({
          workspaceId: seat.workspace_id,
          moduleKey: product.product_key,
          planKey: pendingPlan?.plan_key ?? plan.plan_key,
          billingCycle: seat.billing_cycle,
          seats: pendingSeatChange.data?.seats_after ?? seat.seats_purchased,
          purpose: 'renewal',
          actor: { id: workspace.owner_id, email: account?.email },
          idempotencyKey: `renewal:${seat.id}:${seat.current_period_end}:${pendingPlan?.plan_key ?? plan.plan_key}:${pendingSeatChange.data?.seats_after ?? seat.seats_purchased}`,
          periodStart: new Date(seat.current_period_end),
          dueAt: new Date(seat.current_period_end),
        });
        created += 1;
      } catch (error) {
        skipped += 1;
        console.error('[SubscriptionLifecycle] renewal invoice failed', {
          seatId: seat.id,
          error,
        });
      }
    }
    return { created, skipped };
  }

  private async expireBackendInvoices(now: Date) {
    const result = await this.billingClient.rpc('expire_due_backend_invoices', {
      p_now: now.toISOString(),
    });
    if (result.error) throw result.error;
    for (const invoice of result.data ?? []) {
      await this.notifications.emitBestEffort({
        workspaceId: invoice.workspace_id,
        eventType: 'invoice_expired',
        eventKey: `invoice_expired:${invoice.invoice_id}`,
        title: 'Payment invoice expired',
        message:
          'Payment was not received and the requested paid change was not applied.',
        email: true,
      });
    }
    return (result.data ?? []).length;
  }

  private async expireEntitlements(now: Date) {
    const client = this.billingClient;
    const expired = await client
      .from('module_entitlements')
      .update({ is_active: false, updated_at: now.toISOString() })
      .eq('is_active', true)
      .not('valid_until', 'is', null)
      .lte('valid_until', now.toISOString())
      .select('id, workspace_id, product_id');
    if (expired.error) throw expired.error;
    const freePlan = await client
      .from('plans')
      .select('id')
      .eq('plan_key', 'free_forever')
      .eq('is_active', true)
      .single();
    if (freePlan.error) throw freePlan.error;
    for (const entitlement of expired.data ?? []) {
      await client
        .from('workspace_module_subscriptions')
        .update({
          plan_id: freePlan.data.id,
          status: 'active',
          monthly_amount: 0,
          annual_amount: 0,
          updated_at: now.toISOString(),
        })
        .eq('workspace_id', entitlement.workspace_id)
        .eq('module_id', entitlement.product_id);
      await client
        .from('workspace_module_seats')
        .update({
          status: 'active',
          payment_provider: 'manual',
          provider_customer_id: null,
          provider_subscription_id: null,
          current_period_start: null,
          current_period_end: null,
          provider_metadata: {
            billing_bypassed: true,
            reason: 'free_plan_after_entitlement',
          },
          updated_at: now.toISOString(),
        })
        .eq('workspace_id', entitlement.workspace_id)
        .eq('product_id', entitlement.product_id);
      await this.notifications.emitBestEffort({
        workspaceId: entitlement.workspace_id,
        eventType: 'entitlement_expired',
        eventKey: `entitlement_expired:${entitlement.id}`,
        title: 'Free entitlement expired',
        message:
          'The module moved to Free Forever. Choose a paid plan to restore paid limits.',
        email: true,
      });
    }
    return (expired.data ?? []).length;
  }

  private async processSubscriptionExpiry(now: Date) {
    const client = this.billingClient;
    const graceDays = Math.max(
      0,
      Number(process.env.BILLING_GRACE_PERIOD_DAYS ?? 7),
    );
    const seats = await client
      .from('workspace_module_seats')
      .select('id, workspace_id, product_id, status, current_period_end')
      .in('status', ['active', 'past_due'])
      .not('current_period_end', 'is', null)
      .lte('current_period_end', now.toISOString());
    if (seats.error) throw seats.error;
    let pastDue = 0;
    let expired = 0;
    for (const seat of seats.data ?? []) {
      const entitlement = await client
        .from('module_entitlements')
        .select('id')
        .eq('workspace_id', seat.workspace_id)
        .eq('product_id', seat.product_id)
        .eq('is_active', true)
        .lte('valid_from', now.toISOString())
        .or(`valid_until.is.null,valid_until.gt.${now.toISOString()}`)
        .maybeSingle();
      if (entitlement.error) throw entitlement.error;
      if (entitlement.data) continue;
      const graceEnd = new Date(
        new Date(seat.current_period_end).getTime() + graceDays * DAY_MS,
      );
      const nextStatus = now >= graceEnd ? 'expired' : 'past_due';
      if (seat.status === nextStatus) continue;
      const seatUpdate = await client
        .from('workspace_module_seats')
        .update({ status: nextStatus, updated_at: now.toISOString() })
        .eq('id', seat.id);
      if (seatUpdate.error) throw seatUpdate.error;
      if (nextStatus === 'expired') {
        expired += 1;
        await client
          .from('workspace_module_subscriptions')
          .update({ status: 'suspended', updated_at: now.toISOString() })
          .eq('workspace_id', seat.workspace_id)
          .eq('module_id', seat.product_id);
      } else {
        pastDue += 1;
      }
      const workspaceSeatStates = await client
        .from('workspace_module_seats')
        .select('status')
        .eq('workspace_id', seat.workspace_id)
        .neq('status', 'cancelled');
      if (workspaceSeatStates.error) throw workspaceSeatStates.error;
      const states = (workspaceSeatStates.data ?? []).map(
        (row: { status: string }) => row.status,
      );
      const workspaceStatus = states.includes('active')
        ? 'active'
        : states.includes('past_due')
          ? 'past_due'
          : 'expired';
      await client
        .from('workspace_subscriptions')
        .update({
          subscription_status: workspaceStatus,
          updated_at: now.toISOString(),
        })
        .eq('workspace_id', seat.workspace_id);
      await this.notifications.emitBestEffort({
        workspaceId: seat.workspace_id,
        eventType: 'payment_failed',
        eventKey: `subscription_${nextStatus}:${seat.id}:${seat.current_period_end}`,
        title:
          nextStatus === 'expired'
            ? 'Subscription access expired'
            : 'Subscription payment is overdue',
        message:
          nextStatus === 'expired'
            ? 'The grace period ended without renewal payment. Paid module access is suspended.'
            : `Pay the renewal invoice before the ${graceDays}-day grace period ends.`,
        email: true,
      });
    }
    return { pastDue, expired };
  }
}
