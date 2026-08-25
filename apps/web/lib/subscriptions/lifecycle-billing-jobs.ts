import 'server-only';

import { BackendBillingService } from './backend-billing-service';
import {
  LIFECYCLE_DAY_MS,
  SubscriptionTrialLifecycleJobs,
} from './lifecycle-trial-jobs';
import { RazorpayInvoiceProvider } from './razorpay-provider';

export class SubscriptionBillingLifecycleJobs extends SubscriptionTrialLifecycleJobs {
  protected readonly razorpay = new RazorpayInvoiceProvider();

  protected async synchronizePaymentState() {
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

  protected async applyBackendSeatChanges(now: Date) {
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

  protected async processInvoiceReminders(now: Date) {
    const end = new Date(now.getTime() + 4 * LIFECYCLE_DAY_MS);
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
          (new Date(invoice.due_at).getTime() - now.getTime()) /
            LIFECYCLE_DAY_MS,
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

  protected async createRenewalInvoices(now: Date) {
    const { renewalInvoiceDays: leadDays } = await this.getBillingSettings();
    const end = new Date(now.getTime() + leadDays * LIFECYCLE_DAY_MS);
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
}
