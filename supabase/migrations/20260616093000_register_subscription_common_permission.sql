/*
 * -------------------------------------------------------
 * Migration: Register Subscription Common Permission
 * Date: 2026-06-16
 * Description:
 *   Adds a common Subscription permission module with view/manage features.
 *   This controls billing visibility and subscription mutations across Sales,
 *   Service Cloud, HRMS, and the org subscription page.
 * -------------------------------------------------------
 */

INSERT INTO public.crm_modules (
  module_key,
  module_name,
  description,
  icon,
  display_order,
  is_system,
  is_active,
  product_key
)
VALUES (
  'subscription',
  'Subscription',
  'View and manage workspace subscription, billing, and module seats',
  'CreditCard',
  11,
  TRUE,
  TRUE,
  'common'
)
ON CONFLICT (module_key) DO UPDATE
SET
  module_name = EXCLUDED.module_name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  is_system = TRUE,
  is_active = TRUE,
  product_key = 'common';

INSERT INTO public.crm_module_features (
  module_id,
  feature_key,
  feature_name,
  description,
  feature_type,
  display_order,
  is_system,
  is_active
)
SELECT
  m.id,
  f.feature_key,
  f.feature_name,
  f.description,
  f.feature_type::public.crm_feature_type,
  f.display_order,
  TRUE,
  TRUE
FROM public.crm_modules m
CROSS JOIN (
  SELECT
    'view' AS feature_key,
    'View Subscription' AS feature_name,
    'View billing, subscription status, module seats, and seat assignments' AS description,
    'view' AS feature_type,
    1 AS display_order
  UNION ALL
  SELECT
    'manage',
    'Manage Subscription',
    'Update billing cycle, checkout, seats, modules, cancellations, and seat assignments',
    'action',
    2
) f
WHERE m.module_key = 'subscription'
ON CONFLICT (module_id, feature_key) DO UPDATE
SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  feature_type = EXCLUDED.feature_type,
  display_order = EXCLUDED.display_order,
  is_system = TRUE,
  is_active = TRUE;

INSERT INTO public.product_module_map (
  product_id,
  crm_module_id,
  access_mode
)
SELECT
  sp.id,
  m.id,
  'full'
FROM public.subscription_products sp
CROSS JOIN public.crm_modules m
WHERE sp.is_active = TRUE
  AND m.module_key = 'subscription'
ON CONFLICT (product_id, crm_module_id) DO NOTHING;

INSERT INTO public.role_permissions (
  workspace_id,
  role_id,
  module_feature_id,
  can_access,
  access_level,
  can_view_sensitive_data,
  can_override_owner
)
SELECT
  wr.workspace_id,
  wr.id,
  f.id,
  CASE WHEN wr.role_key = 'admin' THEN TRUE ELSE FALSE END,
  CASE
    WHEN wr.role_key = 'admin' THEN 'all'::public.permission_access_level
    ELSE 'none'::public.permission_access_level
  END,
  CASE WHEN wr.role_key = 'admin' THEN TRUE ELSE FALSE END,
  CASE WHEN wr.role_key = 'admin' THEN TRUE ELSE FALSE END
FROM public.workspace_roles wr
CROSS JOIN public.crm_modules m
JOIN public.crm_module_features f ON f.module_id = m.id
WHERE m.module_key = 'subscription'
ON CONFLICT (role_id, module_feature_id) DO NOTHING;

