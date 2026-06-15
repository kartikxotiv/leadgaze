/*
 * Migration: Rehome Email Permissions
 *
 * Email permissions are product-scoped:
 * - Sales owns Sales email access through emails:manage_email.
 * - Service Cloud owns support email access through emails:manage_inbox.
 * - The legacy common/granular Email permissions are removed.
 */

UPDATE public.crm_modules
SET
  product_key = 'sales',
  module_name = 'Emails',
  description = 'Manage Sales email and Service Cloud inbox permissions',
  updated_at = NOW()
WHERE module_key = 'emails';

UPDATE public.crm_modules
SET
  product_key = 'service_cloud',
  module_name = 'Service Cloud Inboxes',
  description = 'Manage support inboxes, email conversations, and ticket replies',
  is_active = FALSE,
  updated_at = NOW()
WHERE module_key = 'service_cloud_inboxes';

INSERT INTO public.crm_module_features (
  module_id,
  feature_key,
  feature_name,
  description,
  feature_type,
  display_order,
  is_active
)
SELECT
  m.id,
  'manage_email',
  'Manage Email',
  'Manage Sales email inbox, sending, templates, and variables',
  'action'::public.crm_feature_type,
  1,
  TRUE
FROM public.crm_modules m
WHERE m.module_key = 'emails'
ON CONFLICT (module_id, feature_key) DO UPDATE
SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  feature_type = EXCLUDED.feature_type,
  display_order = EXCLUDED.display_order,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.crm_module_features (
  module_id,
  feature_key,
  feature_name,
  description,
  feature_type,
  display_order,
  is_active
)
SELECT
  m.id,
  'manage_inbox',
  'Manage Inbox',
  'Manage support inboxes, ticket email conversations, and replies',
  'action'::public.crm_feature_type,
  1,
  TRUE
FROM public.crm_modules m
WHERE m.module_key = 'emails'
ON CONFLICT (module_id, feature_key) DO UPDATE
SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  feature_type = EXCLUDED.feature_type,
  display_order = EXCLUDED.display_order,
  is_active = TRUE,
  updated_at = NOW();

WITH legacy_sales_email_access AS (
  SELECT
    rp.workspace_id,
    rp.role_id,
    BOOL_OR(rp.can_access) AS can_access,
    BOOL_OR(rp.can_view_sensitive_data) AS can_view_sensitive_data,
    BOOL_OR(rp.can_override_owner) AS can_override_owner
  FROM public.role_permissions rp
  JOIN public.workspace_roles wr ON wr.id = rp.role_id
  JOIN public.crm_module_features f ON f.id = rp.module_feature_id
  JOIN public.crm_modules m ON m.id = f.module_id
  WHERE wr.product_key = 'sales'
    AND m.module_key = 'emails'
    AND f.feature_key IN (
      'view_inbox',
      'send_emails',
      'manage_accounts',
      'manage_templates',
      'manage_variables'
    )
  GROUP BY rp.workspace_id, rp.role_id
),
sales_manage_email_feature AS (
  SELECT f.id
  FROM public.crm_module_features f
  JOIN public.crm_modules m ON m.id = f.module_id
  WHERE m.module_key = 'emails'
    AND f.feature_key = 'manage_email'
)
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
  access.workspace_id,
  access.role_id,
  feature.id,
  access.can_access,
  CASE
    WHEN access.can_access THEN 'all'::public.permission_access_level
    ELSE 'none'::public.permission_access_level
  END,
  access.can_view_sensitive_data,
  access.can_override_owner
FROM legacy_sales_email_access access
CROSS JOIN sales_manage_email_feature feature
ON CONFLICT (role_id, module_feature_id) DO UPDATE
SET
  can_access = EXCLUDED.can_access,
  access_level = EXCLUDED.access_level,
  can_view_sensitive_data = EXCLUDED.can_view_sensitive_data,
  can_override_owner = EXCLUDED.can_override_owner,
  updated_at = NOW();

WITH legacy_service_inbox_access AS (
  SELECT
    rp.workspace_id,
    rp.role_id,
    BOOL_OR(rp.can_access) AS can_access,
    BOOL_OR(rp.can_view_sensitive_data) AS can_view_sensitive_data,
    BOOL_OR(rp.can_override_owner) AS can_override_owner
  FROM public.role_permissions rp
  JOIN public.crm_module_features f ON f.id = rp.module_feature_id
  JOIN public.crm_modules m ON m.id = f.module_id
  WHERE (
      m.module_key = 'service_cloud_inboxes'
      AND f.feature_key IN ('view', 'create', 'edit', 'delete', 'sync')
    )
    OR (
      m.module_key = 'service_cloud_tickets'
      AND f.feature_key = 'reply'
    )
  GROUP BY rp.workspace_id, rp.role_id
),
service_manage_inbox_feature AS (
  SELECT f.id
  FROM public.crm_module_features f
  JOIN public.crm_modules m ON m.id = f.module_id
  WHERE m.module_key = 'emails'
    AND f.feature_key = 'manage_inbox'
)
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
  access.workspace_id,
  access.role_id,
  feature.id,
  access.can_access,
  CASE
    WHEN access.can_access THEN 'all'::public.permission_access_level
    ELSE 'none'::public.permission_access_level
  END,
  access.can_view_sensitive_data,
  access.can_override_owner
FROM legacy_service_inbox_access access
CROSS JOIN service_manage_inbox_feature feature
ON CONFLICT (role_id, module_feature_id) DO UPDATE
SET
  can_access = EXCLUDED.can_access,
  access_level = EXCLUDED.access_level,
  can_view_sensitive_data = EXCLUDED.can_view_sensitive_data,
  can_override_owner = EXCLUDED.can_override_owner,
  updated_at = NOW();

DELETE FROM public.role_permissions rp
USING public.crm_module_features f,
      public.crm_modules m
WHERE rp.module_feature_id = f.id
  AND f.module_id = m.id
  AND m.module_key = 'emails'
  AND f.feature_key IN (
    'view_inbox',
    'send_emails',
    'manage_accounts',
    'manage_templates',
    'manage_variables'
  );

DELETE FROM public.role_permissions rp
USING public.crm_module_features f,
      public.crm_modules m
WHERE rp.module_feature_id = f.id
  AND f.module_id = m.id
  AND (
    (
      m.module_key = 'service_cloud_inboxes'
    )
    OR (
      m.module_key = 'service_cloud_tickets'
      AND f.feature_key = 'reply'
    )
  );

DELETE FROM public.crm_module_features f
USING public.crm_modules m
WHERE f.module_id = m.id
  AND m.module_key = 'emails'
  AND f.feature_key IN (
    'view_inbox',
    'send_emails',
    'manage_accounts',
    'manage_templates',
    'manage_variables'
  );

DELETE FROM public.crm_module_features f
USING public.crm_modules m
WHERE f.module_id = m.id
  AND (
    (
      m.module_key = 'service_cloud_inboxes'
    )
    OR (
      m.module_key = 'service_cloud_tickets'
      AND f.feature_key = 'reply'
    )
  );

DELETE FROM public.product_module_map pmm
USING public.subscription_products sp,
      public.crm_modules m
WHERE pmm.product_id = sp.id
  AND pmm.crm_module_id = m.id
  AND m.module_key = 'emails'
  AND sp.product_key NOT IN ('sales', 'service_cloud');

INSERT INTO public.product_module_map (product_id, crm_module_id, access_mode)
SELECT sp.id, m.id, 'full'
FROM public.subscription_products sp
CROSS JOIN public.crm_modules m
WHERE sp.product_key IN ('sales', 'service_cloud')
  AND sp.is_active = TRUE
  AND m.module_key = 'emails'
  AND m.is_active = TRUE
ON CONFLICT (product_id, crm_module_id) DO NOTHING;
