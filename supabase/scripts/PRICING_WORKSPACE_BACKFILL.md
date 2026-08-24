# Pricing Workspace Backfill Runbook

Run this workflow against staging before production. The foundation and
backfill-function migrations must already be applied.

## 1. Generate the validation report

```bash
psql "$STAGING_DATABASE_URL" \
  -f supabase/scripts/pricing-workspace-backfill-preview.sql \
  > pricing-workspace-backfill-preview.txt
```

Review every row where `blocking_issue` is populated. The apply function will
refuse to run until these are resolved. Active legacy products outside Sales
and Service appear as post-run warnings because their plan catalogs are not in
the current pricing scope.

## 2. Take a staging backup

Use the normal managed-database backup or snapshot workflow. Do not proceed
without a restorable backup.

## 3. Apply explicitly

```bash
psql "$STAGING_DATABASE_URL" \
  -v confirm=APPLY_PRICING_WORKSPACE_BACKFILL_V1 \
  -f supabase/scripts/pricing-workspace-backfill-apply.sql
```

The operation is atomic and protected by an advisory lock. A successful second
execution returns the stored first-run summary with `already_applied: true` and
does not rewrite subscriptions or counters.

## 4. Verify staging

```bash
psql "$STAGING_DATABASE_URL" \
  -f supabase/scripts/pricing-workspace-backfill-verify.sql \
  > pricing-workspace-backfill-verification.txt
```

The verification script fails unless every workspace has one workspace
subscription, explicit Sales and Service module plans, migrated active seat
assignments, and accurate workspace-scoped counters.

Per-lead and per-ticket document/note limits are intentionally not represented
as workspace counters. They must be enforced from the corresponding relation
tables in the entitlement service because their scope is a single parent
record.

Only after the staging report has zero errors should the same preview, backup,
apply, and verify sequence be repeated in production.
