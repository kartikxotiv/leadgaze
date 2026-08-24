\set ON_ERROR_STOP on
\pset pager off

BEGIN TRANSACTION READ ONLY;

\echo 'Pricing workspace backfill summary (read-only)'
SELECT jsonb_pretty(public.preview_pricing_workspace_backfill());

\echo 'Per-workspace and module decisions'
SELECT workspace_id,
       workspace_name,
       module_key,
       target_plan_key,
       assignment_reason,
       paid_seats,
       active_seat_assignments,
       valid_internal_partner_entitlements,
       unsupported_entitlement_types,
       target_billing_cycle,
       existing_plan_key,
       recommended_action,
       blocking_issue
FROM public.get_pricing_workspace_backfill_targets();

\echo 'Blocking decisions that must be resolved before apply'
SELECT workspace_id,
       workspace_name,
       module_key,
       target_plan_key,
       unsupported_entitlement_types,
       blocking_issue
FROM public.get_pricing_workspace_backfill_targets()
WHERE blocking_issue IS NOT NULL;

ROLLBACK;

