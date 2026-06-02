/*
 * -------------------------------------------------------
 * Migration: Register Inventory RBAC and Defaults
 * Date: 2026-06-02
 * Description: Registers inventory modules and features in the shared
 *              RBAC tables and seeds default permissions plus default units
 *              for existing workspaces.
 * -------------------------------------------------------
 */

-- =====================================================
-- 1. Register Inventory Modules
-- =====================================================

INSERT INTO public.crm_modules (module_key, module_name, description, display_order, is_system)
VALUES
  ('inventory', 'Inventory', 'Inventory dashboard and high-level inventory management', 11, TRUE),
  ('inventory_products', 'Inventory Products', 'Manage products, categories, brands, units, and product media', 12, TRUE),
  ('inventory_warehouses', 'Inventory Warehouses', 'Manage warehouses and storage locations', 13, TRUE),
  ('inventory_stock', 'Inventory Stock', 'Manage stock levels, reservations, adjustments, transfers, and movements', 14, TRUE),
  ('inventory_purchases', 'Inventory Purchases', 'Manage vendors, purchase requisitions, purchase orders, and goods receipts', 15, TRUE),
  ('inventory_customers', 'Inventory Customers', 'Manage customer master data and customer contacts used in inventory sales flows', 16, TRUE),
  ('inventory_sales', 'Inventory Sales', 'Manage sales-order driven stock reservations and fulfillment', 17, TRUE),
  ('inventory_audits', 'Inventory Audits', 'Manage stock audits, variance reviews, and reconciliation', 18, TRUE),
  ('inventory_reports', 'Inventory Reports', 'View inventory analytics, reports, and exports', 19, TRUE)
ON CONFLICT (module_key) DO NOTHING;

-- =====================================================
-- 2. Register Inventory Module Features
-- =====================================================

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Inventory' AS feature_name, 'View inventory dashboard, KPIs, and module overview' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'manage', 'Manage Inventory', 'Manage core inventory configuration and administration', 'action', 2
) f
WHERE m.module_key = 'inventory'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Products' AS feature_name, 'View product master records' AS description, 'crud' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'create', 'Create Products', 'Create new products and SKUs', 'crud', 2
  UNION ALL SELECT 'edit', 'Edit Products', 'Edit product records and pricing', 'crud', 3
  UNION ALL SELECT 'delete', 'Delete Products', 'Delete or permanently remove product records', 'crud', 4
  UNION ALL SELECT 'clone', 'Clone Products', 'Clone an existing product into a new SKU', 'action', 5
  UNION ALL SELECT 'archive', 'Archive Products', 'Archive or deactivate products', 'action', 6
  UNION ALL SELECT 'import', 'Import Products', 'Import products in bulk', 'import', 7
  UNION ALL SELECT 'export', 'Export Products', 'Export product data', 'export', 8
  UNION ALL SELECT 'manage_categories', 'Manage Categories', 'Create and maintain product categories', 'action', 9
  UNION ALL SELECT 'manage_brands', 'Manage Brands', 'Create and maintain brands', 'action', 10
  UNION ALL SELECT 'manage_units', 'Manage Units', 'Create and maintain product units', 'action', 11
  UNION ALL SELECT 'manage_media', 'Manage Product Media', 'Upload and manage product images and documents', 'action', 12
) f
WHERE m.module_key = 'inventory_products'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Warehouses' AS feature_name, 'View warehouse records and stock summaries' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'create', 'Create Warehouses', 'Create new warehouses and storage locations', 'crud', 2
  UNION ALL SELECT 'edit', 'Edit Warehouses', 'Edit warehouses and operational settings', 'crud', 3
  UNION ALL SELECT 'delete', 'Delete Warehouses', 'Delete warehouses from the inventory module', 'crud', 4
  UNION ALL SELECT 'manage', 'Manage Warehouses', 'Manage warehouse configuration and managers', 'action', 5
) f
WHERE m.module_key = 'inventory_warehouses'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Stock' AS feature_name, 'View stock levels, ledgers, and reservations' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'receive', 'Receive Stock', 'Receive stock into inventory', 'action', 2
  UNION ALL SELECT 'issue', 'Issue Stock', 'Issue stock out of inventory', 'action', 3
  UNION ALL SELECT 'adjust', 'Adjust Stock', 'Apply manual or audit-based stock adjustments', 'action', 4
  UNION ALL SELECT 'transfer', 'Transfer Stock', 'Transfer stock between warehouses', 'action', 5
  UNION ALL SELECT 'reserve', 'Reserve Stock', 'Reserve stock for downstream workflows', 'action', 6
  UNION ALL SELECT 'release', 'Release Stock', 'Release previously reserved stock', 'action', 7
) f
WHERE m.module_key = 'inventory_stock'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Purchases' AS feature_name, 'View purchase requisitions, purchase orders, and GRNs' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'create', 'Create Purchases', 'Create purchase requisitions and purchase orders', 'crud', 2
  UNION ALL SELECT 'edit', 'Edit Purchases', 'Edit purchase documents before completion', 'crud', 3
  UNION ALL SELECT 'approve', 'Approve Purchases', 'Approve requisitions and purchase orders', 'action', 4
  UNION ALL SELECT 'receive_goods', 'Receive Goods', 'Receive goods against approved purchase orders', 'action', 5
  UNION ALL SELECT 'manage_vendors', 'Manage Vendors', 'Manage vendors and vendor contacts', 'action', 6
) f
WHERE m.module_key = 'inventory_purchases'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Customers' AS feature_name, 'View customer master records and customer contacts' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'create', 'Create Customers', 'Create customer master records', 'crud', 2
  UNION ALL SELECT 'edit', 'Edit Customers', 'Edit customer master records', 'crud', 3
  UNION ALL SELECT 'delete', 'Delete Customers', 'Delete customer records', 'crud', 4
  UNION ALL SELECT 'export', 'Export Customers', 'Export customer records', 'export', 5
  UNION ALL SELECT 'manage_contacts', 'Manage Customer Contacts', 'Create and maintain customer contacts', 'action', 6
) f
WHERE m.module_key = 'inventory_customers'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Sales Orders' AS feature_name, 'View sales orders and fulfillment status' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'create', 'Create Sales Orders', 'Create sales orders from customer demand or external sources', 'crud', 2
  UNION ALL SELECT 'reserve_stock', 'Reserve Stock For Sales', 'Reserve stock for sales order fulfillment', 'action', 3
  UNION ALL SELECT 'fulfill', 'Fulfill Sales Orders', 'Pick and fulfill sales order items', 'action', 4
  UNION ALL SELECT 'dispatch', 'Dispatch Sales Orders', 'Dispatch fulfilled sales orders to customers', 'action', 5
) f
WHERE m.module_key = 'inventory_sales'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Audits' AS feature_name, 'View inventory audit plans and variances' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'create', 'Create Audits', 'Create and run inventory audits or cycle counts', 'crud', 2
  UNION ALL SELECT 'approve', 'Approve Audits', 'Approve completed inventory audits', 'action', 3
  UNION ALL SELECT 'reconcile', 'Reconcile Variance', 'Reconcile stock variances after audits', 'action', 4
) f
WHERE m.module_key = 'inventory_audits'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Reports' AS feature_name, 'View inventory reporting and analytics' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'export', 'Export Reports', 'Export inventory reporting data', 'export', 2
) f
WHERE m.module_key = 'inventory_reports'
ON CONFLICT (module_id, feature_key) DO NOTHING;

-- =====================================================
-- 3. Seed Default Permissions For Existing Workspaces
-- =====================================================

DO $$
DECLARE
  v_workspace_id UUID;
  v_admin_role_id UUID;
  v_manager_role_id UUID;
  v_user_role_id UUID;
  v_viewer_role_id UUID;
BEGIN
  FOR v_workspace_id IN
    SELECT DISTINCT workspace_id FROM public.workspace_roles
  LOOP
    SELECT id INTO v_admin_role_id
      FROM public.workspace_roles
      WHERE workspace_id = v_workspace_id AND role_key = 'admin'
      LIMIT 1;

    SELECT id INTO v_manager_role_id
      FROM public.workspace_roles
      WHERE workspace_id = v_workspace_id AND role_key = 'manager'
      LIMIT 1;

    SELECT id INTO v_user_role_id
      FROM public.workspace_roles
      WHERE workspace_id = v_workspace_id AND role_key = 'user'
      LIMIT 1;

    SELECT id INTO v_viewer_role_id
      FROM public.workspace_roles
      WHERE workspace_id = v_workspace_id AND role_key = 'viewer'
      LIMIT 1;

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
      v_workspace_id,
      v_admin_role_id,
      f.id,
      TRUE,
      'all'::public.permission_access_level,
      TRUE,
      TRUE
    FROM public.crm_module_features f
    JOIN public.crm_modules m ON m.id = f.module_id
    WHERE v_admin_role_id IS NOT NULL
      AND m.module_key IN (
        'inventory',
        'inventory_products',
        'inventory_warehouses',
        'inventory_stock',
        'inventory_purchases',
        'inventory_customers',
        'inventory_sales',
        'inventory_audits',
        'inventory_reports'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.role_permissions rp
        WHERE rp.role_id = v_admin_role_id
          AND rp.module_feature_id = f.id
      );

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
      v_workspace_id,
      v_manager_role_id,
      f.id,
      TRUE,
      'team'::public.permission_access_level,
      FALSE,
      FALSE
    FROM public.crm_module_features f
    JOIN public.crm_modules m ON m.id = f.module_id
    WHERE v_manager_role_id IS NOT NULL
      AND m.module_key IN (
        'inventory',
        'inventory_products',
        'inventory_warehouses',
        'inventory_stock',
        'inventory_purchases',
        'inventory_customers',
        'inventory_sales',
        'inventory_audits',
        'inventory_reports'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.role_permissions rp
        WHERE rp.role_id = v_manager_role_id
          AND rp.module_feature_id = f.id
      );

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
      v_workspace_id,
      v_user_role_id,
      f.id,
      CASE
        WHEN f.feature_key IN (
          'delete',
          'manage',
          'approve',
          'reconcile',
          'manage_categories',
          'manage_brands',
          'manage_units',
          'manage_vendors'
        ) THEN FALSE
        ELSE TRUE
      END,
      CASE
        WHEN f.feature_key IN (
          'delete',
          'manage',
          'approve',
          'reconcile',
          'manage_categories',
          'manage_brands',
          'manage_units',
          'manage_vendors'
        ) THEN 'none'::public.permission_access_level
        ELSE 'own'::public.permission_access_level
      END,
      FALSE,
      FALSE
    FROM public.crm_module_features f
    JOIN public.crm_modules m ON m.id = f.module_id
    WHERE v_user_role_id IS NOT NULL
      AND m.module_key IN (
        'inventory',
        'inventory_products',
        'inventory_warehouses',
        'inventory_stock',
        'inventory_purchases',
        'inventory_customers',
        'inventory_sales',
        'inventory_audits',
        'inventory_reports'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.role_permissions rp
        WHERE rp.role_id = v_user_role_id
          AND rp.module_feature_id = f.id
      );

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
      v_workspace_id,
      v_viewer_role_id,
      f.id,
      CASE
        WHEN f.feature_key IN ('view', 'export') THEN TRUE
        ELSE FALSE
      END,
      CASE
        WHEN f.feature_key IN ('view', 'export') THEN 'all'::public.permission_access_level
        ELSE 'none'::public.permission_access_level
      END,
      FALSE,
      FALSE
    FROM public.crm_module_features f
    JOIN public.crm_modules m ON m.id = f.module_id
    WHERE v_viewer_role_id IS NOT NULL
      AND m.module_key IN (
        'inventory',
        'inventory_products',
        'inventory_warehouses',
        'inventory_stock',
        'inventory_purchases',
        'inventory_customers',
        'inventory_sales',
        'inventory_audits',
        'inventory_reports'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.role_permissions rp
        WHERE rp.role_id = v_viewer_role_id
          AND rp.module_feature_id = f.id
      );
  END LOOP;
END $$;

-- =====================================================
-- 4. Seed Default Units For Existing Workspaces
-- =====================================================

DO $$
DECLARE
  v_workspace_id UUID;
BEGIN
  FOR v_workspace_id IN
    SELECT id FROM public.workspaces
  LOOP
    INSERT INTO inventory.units (workspace_id, unit_name, unit_code, unit_type, allows_decimal, is_system)
    VALUES
      (v_workspace_id, 'Piece', 'PCS', 'count', FALSE, TRUE),
      (v_workspace_id, 'Kilogram', 'KG', 'weight', TRUE, TRUE),
      (v_workspace_id, 'Gram', 'GM', 'weight', TRUE, TRUE),
      (v_workspace_id, 'Liter', 'LTR', 'volume', TRUE, TRUE),
      (v_workspace_id, 'Meter', 'MTR', 'length', TRUE, TRUE),
      (v_workspace_id, 'Box', 'BOX', 'packaging', FALSE, TRUE),
      (v_workspace_id, 'Carton', 'CTN', 'packaging', FALSE, TRUE),
      (v_workspace_id, 'Pack', 'PACK', 'packaging', FALSE, TRUE)
    ON CONFLICT (workspace_id, unit_name) DO NOTHING;
  END LOOP;
END $$;

GRANT ALL ON ALL TABLES IN SCHEMA inventory TO authenticated, service_role, anon;
