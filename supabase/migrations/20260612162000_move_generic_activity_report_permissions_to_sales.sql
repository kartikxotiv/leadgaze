/*
 * Keep generic CRM Activities and Reports out of non-sales role permissions.
 *
 * Service Cloud, Inventory, and HRMS have their own product-specific activity
 * or reporting surfaces. The generic Activities and Reports RBAC modules belong
 * to Sales, so they should not appear in /home/services/roles.
 */

DELETE FROM public.role_permissions rp
USING public.workspace_roles wr,
      public.crm_module_features f,
      public.crm_modules m
WHERE rp.role_id = wr.id
  AND rp.module_feature_id = f.id
  AND f.module_id = m.id
  AND m.module_key IN ('activities', 'reports')
  AND wr.product_key IS DISTINCT FROM 'sales';

UPDATE public.crm_modules
SET product_key = 'sales'
WHERE module_key IN ('activities', 'reports')
  AND product_key IS DISTINCT FROM 'sales';
