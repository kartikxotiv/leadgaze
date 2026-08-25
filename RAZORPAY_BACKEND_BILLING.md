# Razorpay backend billing setup

Leadgaze owns plans, prices, discounts, seat quantities, billing periods,
renewals, grace periods, expiry, and notifications. Razorpay is used only to
create an invoice/payment URL and collect the payment.

## 1. Apply the additive migration

Back up the database, dry-run, and then apply:

`supabase/migrations/20260824120000_add_backend_razorpay_billing.sql`

The migration does not edit any earlier migration. It adds:

- `backend_billing_invoices` and `backend_billing_invoice_items`
- `backend_seat_changes`
- `billing_discounts` and `workspace_billing_discounts`
- Atomic functions for paid invoices, scheduled reductions, and expiry

Regenerate Supabase TypeScript types after applying it in the target project.

## 2. Configure server-only environment variables

```dotenv
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
CRON_SECRET=

BILLING_INVOICE_DUE_DAYS=7
BILLING_RENEWAL_INVOICE_DAYS=7
BILLING_GRACE_PERIOD_DAYS=7

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

Never expose the Razorpay key secret or webhook secret through a
`NEXT_PUBLIC_` variable.

## 3. Configure Razorpay

Set the webhook URL to:

`https://<app-domain>/api/subscriptions/webhook`

Enable invoice and payment-link payment/expiry events, including
`invoice.paid`, `invoice.expired`, `payment_link.paid`, and
`payment_link.expired`. Use a dedicated webhook secret matching
`RAZORPAY_WEBHOOK_SECRET`.

Razorpay email and SMS delivery are disabled in API requests. Leadgaze sends
the invoice notification through its configured SMTP account, with the
Razorpay `short_url` as the payment action.

## 4. Configure backend prices and discounts

Paid amounts come from `module_plan_prices`, never Razorpay plans or packages.
A paid plan with a `NULL` monthly/yearly price cannot be invoiced. Configure
those catalog values before making that plan purchasable.

Create discounts in `billing_discounts`, then explicitly assign them to a
workspace using `workspace_billing_discounts`. Assignments may optionally be
limited to one module and/or plan. The calculated discount and final amount
are snapshotted on every invoice.

## 5. Billing behavior

- New purchase or paid plan upgrade: Leadgaze calculates the amount, creates a
  local invoice, asks Razorpay for an invoice/payment URL, and emails it.
- Payment confirmation: only a verified, idempotent webhook activates the
  paid plan or increased seats.
- Seat increase: only the additional seats are invoiced, prorated for the
  remaining current period.
- Seat decrease: no Razorpay call is made. The decrease is scheduled for
  `current_period_end` and applied by the lifecycle cron.
- Renewal: the cron creates a new invoice before period end. An unpaid renewal
  becomes past due, then expires after the configured grace period.
- Entitled module: a valid `module_entitlements` row bypasses payment. A finite
  `granted_seats` value remains the free seat cap; `NULL` means unlimited.
- Entitlement expiry: the lifecycle job moves that module to Free Forever and
  sends a notification.

Run the lifecycle endpoint on a reliable schedule (hourly is suitable):

```text
GET /api/cron/subscriptions
Authorization: Bearer <CRON_SECRET>
```

## 6. Operational verification

1. Create a test invoice and confirm it appears on the subscription page.
2. Confirm the email contains the same payment URL stored in
   `backend_billing_invoices.payment_url`.
3. Pay it in Razorpay test mode and confirm the invoice becomes `paid` and the
   plan/seat increase is applied once.
4. Replay the webhook and confirm no second seat or discount change occurs.
5. Schedule a seat reduction and run the cron before and after period end.
6. Test an entitled workspace and confirm no Razorpay invoice is created.

Razorpay documents that invoices created through its API are not
GST-compliant. If a statutory GST tax invoice is required, generate that
document in the Leadgaze backend and use Razorpay only for its collection link.

Official references:

- https://razorpay.com/docs/api/payments/invoices/
- https://razorpay.com/docs/webhooks/
- https://razorpay.com/docs/webhooks/payment-links/
