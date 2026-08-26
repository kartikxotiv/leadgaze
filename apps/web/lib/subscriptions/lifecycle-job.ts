import 'server-only';

import { SubscriptionExpiryLifecycleJobs } from './lifecycle-expiry-jobs';

export class SubscriptionLifecycleJob extends SubscriptionExpiryLifecycleJobs {
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
}
