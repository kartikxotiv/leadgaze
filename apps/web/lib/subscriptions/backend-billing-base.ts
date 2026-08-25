import 'server-only';

import type {
  BackendClient,
  BillingClient,
  CreatePlanInvoiceInput,
  InvoicePurpose,
} from './backend-billing-types';
import { SubscriptionApiError } from './errors';
import { SubscriptionNotificationService } from './notification-service';
import { RazorpayInvoiceProvider } from './razorpay-provider';

export abstract class BackendBillingBase {
  protected readonly billingClient: BillingClient;
  protected readonly provider: RazorpayInvoiceProvider;
  protected readonly notifications = new SubscriptionNotificationService();

  constructor(client: BackendClient, provider = new RazorpayInvoiceProvider()) {
    this.billingClient = client;
    this.provider = provider;
  }

  abstract createPlanInvoice(
    input: CreatePlanInvoiceInput,
  ): Promise<BillingClient>;

  protected async getActiveEntitlement(workspaceId: string, moduleId: string) {
    const now = new Date().toISOString();
    const result = await this.billingClient
      .from('module_entitlements')
      .select('id, granted_seats, valid_until')
      .eq('workspace_id', workspaceId)
      .eq('product_id', moduleId)
      .eq('is_active', true)
      .lte('valid_from', now)
      .or(`valid_until.is.null,valid_until.gt.${now}`)
      .maybeSingle();
    if (result.error) throw result.error;
    return result.data;
  }

  protected assertEntitledSeatLimit(
    grantedSeats: number | null,
    requestedSeats: number,
  ) {
    if (grantedSeats !== null && requestedSeats > grantedSeats) {
      throw new SubscriptionApiError(
        `This free entitlement allows at most ${grantedSeats} seats`,
        409,
        'FEATURE_LIMIT_EXCEEDED',
      );
    }
  }

  protected async resolveDiscount(input: {
    workspaceId: string;
    moduleId?: string;
    planId: string;
    discountCode?: string;
    currency: string;
  }) {
    const now = new Date().toISOString();
    const query = this.billingClient
      .from('workspace_billing_discounts')
      .select('*, billing_discounts(*)')
      .eq('workspace_id', input.workspaceId)
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gt.${now}`);
    const assignments = await query;
    if (assignments.error) throw assignments.error;
    const candidates = (assignments.data ?? [])
      .filter(
        (row: BillingClient) =>
          (input.moduleId
            ? !row.module_id || row.module_id === input.moduleId
            : !row.module_id) &&
          (!row.plan_id || row.plan_id === input.planId) &&
          (row.maximum_uses === null || row.use_count < row.maximum_uses),
      )
      .map((row: BillingClient) => {
        const discount = Array.isArray(row.billing_discounts)
          ? row.billing_discounts[0]
          : row.billing_discounts;
        return discount ? { ...discount, workspace_discount_id: row.id } : null;
      })
      .filter(
        (discount: BillingClient) =>
          discount?.is_active &&
          (!input.discountCode ||
            discount.discount_code === input.discountCode) &&
          (!discount.currency || discount.currency === input.currency) &&
          (!discount.maximum_redemptions ||
            discount.redemption_count < discount.maximum_redemptions) &&
          (!discount.starts_at || discount.starts_at <= now) &&
          (!discount.ends_at || discount.ends_at > now),
      );
    if (input.discountCode && candidates.length === 0) {
      throw new SubscriptionApiError(
        'The discount code is not valid for this workspace, module, or plan',
        409,
        'CONFLICT',
      );
    }
    return candidates[0] ?? null;
  }

  protected async cancelOpenSeatChange(workspaceId: string, moduleId: string) {
    const open = await this.billingClient
      .from('backend_seat_changes')
      .select(
        'id, invoice_id, backend_billing_invoices(razorpay_invoice_id, status)',
      )
      .eq('workspace_id', workspaceId)
      .eq('module_id', moduleId)
      .in('status', ['awaiting_payment', 'scheduled']);
    if (open.error) throw open.error;
    const invoiceIds: string[] = [];
    for (const change of open.data ?? []) {
      if (!change.invoice_id) continue;
      invoiceIds.push(change.invoice_id);
      const invoice = Array.isArray(change.backend_billing_invoices)
        ? change.backend_billing_invoices[0]
        : change.backend_billing_invoices;
      if (invoice?.status === 'issued' && invoice.razorpay_invoice_id) {
        await this.provider.cancelInvoice(invoice.razorpay_invoice_id);
      }
    }
    const result = await this.billingClient
      .from('backend_seat_changes')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('workspace_id', workspaceId)
      .eq('module_id', moduleId)
      .in('status', ['awaiting_payment', 'scheduled']);
    if (result.error) throw result.error;
    if (invoiceIds.length) {
      const invoices = await this.billingClient
        .from('backend_billing_invoices')
        .update({ status: 'cancelled' })
        .in('id', invoiceIds)
        .in('status', ['draft', 'issued', 'failed']);
      if (invoices.error) throw invoices.error;
    }
  }

  async cancelOpenInvoices(
    workspaceId: string,
    moduleId: string,
    purposes: InvoicePurpose[],
  ) {
    const open = await this.billingClient
      .from('backend_billing_invoices')
      .select('id, status, razorpay_invoice_id')
      .eq('workspace_id', workspaceId)
      .eq('module_id', moduleId)
      .in('purpose', purposes)
      .in('status', ['draft', 'issued']);
    if (open.error) throw open.error;
    for (const invoice of open.data ?? []) {
      if (invoice.status === 'issued' && invoice.razorpay_invoice_id) {
        await this.provider.cancelInvoice(invoice.razorpay_invoice_id);
      }
    }
    const ids = (open.data ?? []).map((invoice: { id: string }) => invoice.id);
    if (ids.length) {
      const update = await this.billingClient
        .from('backend_billing_invoices')
        .update({ status: 'cancelled' })
        .in('id', ids)
        .in('status', ['draft', 'issued']);
      if (update.error) throw update.error;
    }
  }

  protected async cancelOpenBundleInvoices(
    workspaceId: string,
    bundleId: string,
    purposes: InvoicePurpose[],
  ) {
    const open = await this.billingClient
      .from('backend_billing_invoices')
      .select('id, status, razorpay_invoice_id')
      .eq('workspace_id', workspaceId)
      .eq('bundle_id', bundleId)
      .in('purpose', purposes)
      .in('status', ['draft', 'issued']);
    if (open.error) throw open.error;
    for (const invoice of open.data ?? []) {
      if (invoice.status === 'issued' && invoice.razorpay_invoice_id) {
        await this.provider.cancelInvoice(invoice.razorpay_invoice_id);
      }
    }
    const ids = (open.data ?? []).map((invoice: { id: string }) => invoice.id);
    if (ids.length) {
      const update = await this.billingClient
        .from('backend_billing_invoices')
        .update({ status: 'cancelled' })
        .in('id', ids)
        .in('status', ['draft', 'issued']);
      if (update.error) throw update.error;
    }
  }

  protected async getOwnerEmail(workspaceId: string) {
    const result = await this.billingClient
      .from('workspaces')
      .select('accounts!workspaces_owner_id_fkey(email)')
      .eq('id', workspaceId)
      .single();
    if (result.error) throw result.error;
    const account = Array.isArray(result.data.accounts)
      ? result.data.accounts[0]
      : result.data.accounts;
    if (!account?.email) {
      throw new SubscriptionApiError(
        'The billing owner does not have an email address',
        409,
        'ENTITLEMENT_CONFIGURATION_ERROR',
      );
    }
    return account.email;
  }

  protected invoiceDueDays() {
    const configured = Number(process.env.BILLING_INVOICE_DUE_DAYS ?? 7);
    return Number.isFinite(configured) && configured > 0
      ? Math.floor(configured)
      : 7;
  }

  protected subscriptionUrl() {
    return `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/org/subscription`;
  }

  protected paymentReturnUrl(returnUrl?: string) {
    const appUrl = new URL(
      process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    );
    const target = new URL(returnUrl ?? '/org/subscription', appUrl);
    if (target.origin !== appUrl.origin) {
      throw new SubscriptionApiError(
        'The payment return URL must belong to this application',
        400,
        'BAD_REQUEST',
      );
    }
    target.searchParams.set('payment', 'success');
    return target.toString();
  }
}
