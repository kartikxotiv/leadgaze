\set ON_ERROR_STOP on
\pset pager off

\if :{?confirm}
  SELECT :'confirm' = 'APPLY_PRICING_WORKSPACE_BACKFILL_V1' AS confirmation_valid
  \gset
\else
  \echo 'Missing confirmation. Re-run with:'
  \echo '  -v confirm=APPLY_PRICING_WORKSPACE_BACKFILL_V1'
  \quit
\endif

\if :confirmation_valid
\else
  \echo 'Invalid confirmation; no data was changed.'
  \quit
\endif

SELECT (public.preview_pricing_workspace_backfill()->>'safe_to_apply')::BOOLEAN
  AS safe_to_apply
\gset

\if :safe_to_apply
\else
  \echo 'Preview contains blocking issues; no data was changed.'
  \quit
\endif

BEGIN;

SELECT jsonb_pretty(
  public.apply_pricing_workspace_backfill(:'confirm')
) AS apply_result;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.validate_pricing_workspace_backfill()
    WHERE severity = 'error'
  ) THEN
    RAISE EXCEPTION 'Post-backfill validation contains errors';
  END IF;
END
$$;

COMMIT;

\echo 'Backfill completed. Run pricing-workspace-backfill-verify.sql next.'

