BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SET LOCAL request.jwt.claim.role = 'service_role';

SELECT plan(8);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'backend_billing_invoices'
      AND column_name = 'bundle_id'
  ),
  'backend invoices identify the purchased bundle'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'backend_seat_changes'
      AND column_name = 'change_group_id'
  ),
  'bundle module seat changes share a change group'
);

SELECT ok(
  to_regprocedure(
    'public.apply_paid_backend_bundle_invoice(uuid,text,timestamp with time zone)'
  ) IS NOT NULL,
  'atomic paid bundle invoice application function exists'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.bundles bundle
    WHERE bundle.bundle_key IN (
        'sales_service_launch_bundle',
        'sales_service_growth_bundle',
        'sales_service_scale_bundle'
      )
      AND (
        SELECT ARRAY_AGG(product.product_key ORDER BY product.product_key)
        FROM public.bundle_modules mapping
        JOIN public.subscription_products product ON product.id = mapping.module_id
        WHERE mapping.bundle_id = bundle.id
      ) = ARRAY['sales', 'service_cloud']::VARCHAR[]
  ),
  3::BIGINT,
  'each paid bundle maps to exactly Sales and Service'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint constraint_row
    WHERE constraint_row.conname = 'backend_billing_invoices_purpose_check'
      AND pg_get_constraintdef(constraint_row.oid) LIKE '%bundle_renewal%'
      AND pg_get_constraintdef(constraint_row.oid) LIKE '%bundle_seat_increase%'
  ),
  'invoice purposes include the bundle lifecycle'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.apply_paid_backend_bundle_invoice(uuid,text,timestamp with time zone)',
    'EXECUTE'
  ),
  'only the backend service role can invoke paid bundle activation'
);

SELECT ok(
  to_regprocedure(
    'public.assign_backend_bundle_user(uuid,uuid,uuid,uuid)'
  ) IS NOT NULL,
  'atomic bundle-user assignment function exists'
);

SELECT ok(
  to_regprocedure(
    'public.remove_backend_bundle_user(uuid,uuid,uuid,uuid)'
  ) IS NOT NULL,
  'atomic bundle-user removal function exists'
);

SELECT * FROM finish();

ROLLBACK;
