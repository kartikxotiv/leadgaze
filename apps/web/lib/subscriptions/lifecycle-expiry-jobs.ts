import 'server-only';

import { SubscriptionBillingLifecycleJobs } from './lifecycle-billing-jobs';
import { LIFECYCLE_DAY_MS } from './lifecycle-trial-jobs';

export class SubscriptionExpiryLifecycleJobs extends SubscriptionBillingLifecycleJobs {
  protected async expireBackendInvoices(now: Date) {
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

  protected async expireEntitlements(now: Date) {
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

  protected async processSubscriptionExpiry(now: Date) {
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
        new Date(seat.current_period_end).getTime() +
          graceDays * LIFECYCLE_DAY_MS,
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
