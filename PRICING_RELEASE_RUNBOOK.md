# Pricing Release Runbook

Nothing in this runbook should be pushed or deployed until the preceding gate
has passed in staging and a rollback owner has approved the next phase.

## Preflight: run all automated coverage locally

1. Start/reset the local Supabase test database and run pgTAP:

   ```powershell
   pnpm exec supabase start --ignore-health-check
   pnpm exec supabase db reset --local --no-seed
   pnpm exec supabase db test
   ```

2. Run the server rule and compensation tests:

   ```powershell
   pnpm --dir apps/web test:pricing
   ```

3. Run the concurrent boundary test with credentials from the local
   `supabase status` output. Do not save the secret in a file:

   ```powershell
   $env:SUPABASE_TEST_URL = '<local API URL>'
   $env:SUPABASE_TEST_SERVICE_ROLE_KEY = '<local service-role or secret key>'
   pnpm --dir apps/web test:pricing:concurrency
   Remove-Item Env:SUPABASE_TEST_URL
   Remove-Item Env:SUPABASE_TEST_SERVICE_ROLE_KEY
   ```

4. Run focused static checks, then stop the test stack:

   ```powershell
   pnpm --dir apps/web exec eslint lib/entitlements lib/subscriptions app/api/subscriptions app/api/cron/subscriptions
   pnpm --dir packages/supabase typecheck
   pnpm exec supabase stop
   ```

Expected result: every test passes, exactly the configured number of concurrent
requests consume the limit, and no pricing-related lint or type errors remain.

## 1. Release database and seeds

- Confirm whether any old pricing migration timestamps were applied to the
  target. If they were, stop and repair migration history before using the
  renamed `20260820144712`–`20260820144716` files.
- Take a restorable database snapshot.
- Review `supabase db push --dry-run`, then apply only the five ordered pricing
  migrations.
- Verify plans, prices, inheritance, 36 features, bundles, RBAC seeds, RLS,
  functions, indexes, and triggers.

Gate: migration succeeds in staging and the pricing pgTAP suite passes there.
Rollback: restore the snapshot; do not try to partially drop pricing objects.

## 2. Backfill workspaces

- Generate the read-only report with
  `supabase/scripts/pricing-workspace-backfill-preview.sql`.
- Resolve every `blocking_issue`, take another snapshot, and run the guarded
  apply script with its confirmation token.
- Run `pricing-workspace-backfill-verify.sql` and require zero error rows.
- Confirm every workspace and both supported modules have explicit plans. Never
  add application fallback plans.

Gate: counts match, module users are converted, counters match business records,
and a second backfill run reports `already_applied`.

## 3. Release server enforcement behind the flag

- Deploy server code with both variables unset. Enforcement is off by default:
  - `ENTITLEMENT_ENFORCEMENT_ENABLED=false`
  - `ENTITLEMENT_ENFORCEMENT_WORKSPACE_IDS=`

- Add internal workspace UUIDs to the comma-separated allowlist.
- Exercise create, import, delete, integrations, and limit-boundary paths.
- Watch structured `[EntitlementEnforcement] blocked` logs and reconciliation
  results. Remove a workspace from the allowlist for immediate rollback.

Gate: internal workspaces show correct blocks with no counter drift or failed
write leakage.

## 4. Release APIs and lifecycle jobs

- Deploy pricing/subscription APIs and webhook changes while the public UI stays
  hidden.
- Configure `CRON_SECRET`, Stripe webhook secret, Stripe price mappings, and
  SMTP credentials.
- Invoke the subscription cron twice and confirm the second run creates no
  duplicate billing events, changes, or notifications.
- Replay a Stripe test event and confirm `payment_events.provider_event_id`
  prevents duplicate processing.

Gate: authorization tests pass; retries are idempotent; failed email deliveries
remain retryable; payment and subscription states synchronize.

## 5. Release the internal subscription UI

- Enable `/org/subscription` only for internal workspaces/users first.
- Verify usage, plan actions, checkout, module users, pending changes, banners,
  and notifications against the server responses.
- Confirm direct API calls still enforce permissions and entitlements when UI
  controls are bypassed.

Gate: billing-owner, administrator, and ordinary-member acceptance checks pass.

## 6. Release the public pricing page

- Publish `/pricing` after catalog values are approved by Product and Finance.
- Compare monthly/yearly module prices, Growth bundle savings, mixed-plan
  totals, feature inheritance, and all CTA destinations.
- Check mobile, dark mode, anonymous access, and caching/revalidation.

Gate: displayed values exactly match the seeded catalog and Stripe mappings.

## 7. Enable enforcement gradually and monitor

- Expand `ENTITLEMENT_ENFORCEMENT_WORKSPACE_IDS` in small cohorts: internal,
  partner, low-usage customers, then higher-usage customers.
- Hold each cohort long enough to review blocked-request logs, failed payments,
  notification failures, support tickets, and reconciliation corrections.
- Run these operational checks after every cohort:

  ```sql
  SELECT public.reconcile_subscription_usage();

  SELECT subscription_status, COUNT(*)
  FROM public.workspace_subscriptions
  GROUP BY subscription_status
  ORDER BY subscription_status;

  SELECT delivery_status, COUNT(*)
  FROM public.subscription_notifications
  WHERE channel = 'email'
  GROUP BY delivery_status;
  ```

- When every cohort is stable, set
  `ENTITLEMENT_ENFORCEMENT_ENABLED=true` and clear the allowlist.
- Roll back instantly by setting the global flag to `false` and reducing or
  clearing the allowlist. Do not roll back by deleting plans or counters.

Final gate: reconciliation corrections stay at zero or an explained baseline,
failed payments are handled, blocked requests match intended plan limits, and
support volume remains acceptable.
