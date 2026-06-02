/*
 * -------------------------------------------------------
 * Migration: Create Inventory Core Tables
 * Date: 2026-06-02
 * Description: Creates the dedicated `inventory` schema and
 *              the core master data tables used by the inventory module:
 *                - inventory.product_categories
 *                - inventory.brands
 *                - inventory.units
 *                - inventory.warehouses
 *                - inventory.vendors
 *                - inventory.vendor_contacts
 *                - inventory.products
 *                - inventory.product_media
 *
 *              Cross-schema FK references to public.workspaces,
 *              public.accounts, and public CRM tables are intentional.
 *              Workspace, authentication, and shared CRM entities live
 *              in the platform layer under the public schema.
 * -------------------------------------------------------
 */

-- =====================================================
-- 0. Create Inventory Schema
-- =====================================================

CREATE SCHEMA IF NOT EXISTS inventory;

COMMENT ON SCHEMA inventory IS 'Dedicated schema for the inventory and stock management module.';

GRANT USAGE ON SCHEMA inventory TO authenticated, service_role, anon;

-- =====================================================
-- 1. Shared updated_at Trigger Function
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. Product Categories
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  parent_category_id UUID REFERENCES inventory.product_categories(id) ON DELETE SET NULL,
  category_name VARCHAR(150) NOT NULL,
  category_code VARCHAR(80),
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_product_categories_name_unique UNIQUE (workspace_id, category_name)
);

COMMENT ON TABLE inventory.product_categories IS 'Hierarchical product categories used to organize inventory items.';

CREATE INDEX IF NOT EXISTS idx_inv_product_categories_workspace ON inventory.product_categories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_product_categories_parent ON inventory.product_categories(parent_category_id) WHERE parent_category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_product_categories_active ON inventory.product_categories(workspace_id, is_active) WHERE is_active = TRUE AND is_deleted = FALSE;

-- =====================================================
-- 3. Brands
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  brand_name VARCHAR(150) NOT NULL,
  brand_code VARCHAR(80),
  description TEXT,
  logo_url VARCHAR(1000),
  website VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_brands_name_unique UNIQUE (workspace_id, brand_name)
);

COMMENT ON TABLE inventory.brands IS 'Product brands maintained per workspace.';

CREATE INDEX IF NOT EXISTS idx_inv_brands_workspace ON inventory.brands(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_brands_active ON inventory.brands(workspace_id, is_active) WHERE is_active = TRUE AND is_deleted = FALSE;

-- =====================================================
-- 4. Units
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  unit_name VARCHAR(100) NOT NULL,
  unit_code VARCHAR(40) NOT NULL,
  unit_type VARCHAR(50) NOT NULL DEFAULT 'count',
  base_unit_id UUID REFERENCES inventory.units(id) ON DELETE SET NULL,
  conversion_factor NUMERIC(18, 6) NOT NULL DEFAULT 1,
  allows_decimal BOOLEAN NOT NULL DEFAULT TRUE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_units_name_unique UNIQUE (workspace_id, unit_name),
  CONSTRAINT inventory_units_code_unique UNIQUE (workspace_id, unit_code),
  CONSTRAINT inventory_units_conversion_factor_check CHECK (conversion_factor > 0)
);

COMMENT ON TABLE inventory.units IS 'Measurement units used by inventory products and transactions.';

CREATE INDEX IF NOT EXISTS idx_inv_units_workspace ON inventory.units(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_units_active ON inventory.units(workspace_id, is_active) WHERE is_active = TRUE;

-- =====================================================
-- 5. Warehouses
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  warehouse_name VARCHAR(150) NOT NULL,
  warehouse_code VARCHAR(60) NOT NULL,
  warehouse_type VARCHAR(50) NOT NULL DEFAULT 'storage',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  description TEXT,
  warehouse_manager_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  email VARCHAR(255),
  phone_number VARCHAR(50),
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(120),
  state VARCHAR(120),
  postal_code VARCHAR(40),
  country VARCHAR(120),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  allow_negative_stock BOOLEAN NOT NULL DEFAULT FALSE,
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_warehouses_name_unique UNIQUE (workspace_id, warehouse_name),
  CONSTRAINT inventory_warehouses_code_unique UNIQUE (workspace_id, warehouse_code)
);

COMMENT ON TABLE inventory.warehouses IS 'Warehouses and storage locations used to hold inventory stock.';

CREATE INDEX IF NOT EXISTS idx_inv_warehouses_workspace ON inventory.warehouses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_warehouses_manager ON inventory.warehouses(warehouse_manager_id) WHERE warehouse_manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_warehouses_active ON inventory.warehouses(workspace_id, status) WHERE is_deleted = FALSE;

-- =====================================================
-- 6. Vendors
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  vendor_name VARCHAR(180) NOT NULL,
  vendor_code VARCHAR(80),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  email VARCHAR(255),
  phone_number VARCHAR(50),
  website VARCHAR(500),
  gst_number VARCHAR(80),
  tax_identifier VARCHAR(80),
  payment_terms VARCHAR(120),
  description TEXT,
  owner_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  billing_address_line_1 VARCHAR(255),
  billing_address_line_2 VARCHAR(255),
  billing_city VARCHAR(120),
  billing_state VARCHAR(120),
  billing_postal_code VARCHAR(40),
  billing_country VARCHAR(120),
  shipping_address_line_1 VARCHAR(255),
  shipping_address_line_2 VARCHAR(255),
  shipping_city VARCHAR(120),
  shipping_state VARCHAR(120),
  shipping_postal_code VARCHAR(40),
  shipping_country VARCHAR(120),
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_vendors_name_unique UNIQUE (workspace_id, vendor_name)
);

COMMENT ON TABLE inventory.vendors IS 'Vendors and suppliers used by procurement and stock receiving workflows.';

CREATE INDEX IF NOT EXISTS idx_inv_vendors_workspace ON inventory.vendors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_vendors_owner ON inventory.vendors(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_vendors_status ON inventory.vendors(workspace_id, status) WHERE is_deleted = FALSE;

-- =====================================================
-- 7. Vendor Contacts
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.vendor_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES inventory.vendors(id) ON DELETE CASCADE,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120),
  email VARCHAR(255),
  phone_number VARCHAR(50),
  designation VARCHAR(120),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE inventory.vendor_contacts IS 'Vendor contact persons used for purchase orders and communications.';

CREATE INDEX IF NOT EXISTS idx_inv_vendor_contacts_workspace ON inventory.vendor_contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_vendor_contacts_vendor ON inventory.vendor_contacts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_inv_vendor_contacts_email ON inventory.vendor_contacts(email) WHERE email IS NOT NULL;

-- =====================================================
-- 8. Products
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category_id UUID REFERENCES inventory.product_categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES inventory.brands(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES inventory.units(id) ON DELETE RESTRICT,
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(120) NOT NULL,
  barcode VARCHAR(255),
  qr_code VARCHAR(255),
  product_code VARCHAR(120),
  product_type VARCHAR(50) NOT NULL DEFAULT 'physical',
  inventory_method VARCHAR(50) NOT NULL DEFAULT 'standard',
  description TEXT,
  cost_price NUMERIC(18, 2),
  selling_price NUMERIC(18, 2),
  wholesale_price NUMERIC(18, 2),
  distributor_price NUMERIC(18, 2),
  reorder_level NUMERIC(18, 4) NOT NULL DEFAULT 0,
  safety_stock NUMERIC(18, 4) NOT NULL DEFAULT 0,
  minimum_stock NUMERIC(18, 4) NOT NULL DEFAULT 0,
  maximum_stock NUMERIC(18, 4),
  track_inventory BOOLEAN NOT NULL DEFAULT TRUE,
  track_batches BOOLEAN NOT NULL DEFAULT FALSE,
  track_serial_numbers BOOLEAN NOT NULL DEFAULT FALSE,
  track_expiry BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  owner_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_products_sku_unique UNIQUE (workspace_id, sku),
  CONSTRAINT inventory_products_maximum_stock_check CHECK (maximum_stock IS NULL OR maximum_stock >= minimum_stock),
  CONSTRAINT inventory_products_reorder_level_check CHECK (reorder_level >= 0 AND safety_stock >= 0 AND minimum_stock >= 0)
);

COMMENT ON TABLE inventory.products IS 'Inventory product master storing SKU, pricing, stock controls, and tracking behaviour.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_products_product_code_unique
  ON inventory.products(workspace_id, product_code)
  WHERE product_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inv_products_workspace ON inventory.products(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_products_category ON inventory.products(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_products_brand ON inventory.products(brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_products_status ON inventory.products(workspace_id, status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_inv_products_owner ON inventory.products(owner_id) WHERE owner_id IS NOT NULL;

-- =====================================================
-- 9. Product Media
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.product_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES inventory.products(id) ON DELETE CASCADE,
  media_type VARCHAR(50) NOT NULL DEFAULT 'image',
  file_name VARCHAR(255),
  file_url VARCHAR(1000) NOT NULL,
  mime_type VARCHAR(120),
  file_size_bytes BIGINT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE inventory.product_media IS 'Stores product images, documents, and specification attachments.';

CREATE INDEX IF NOT EXISTS idx_inv_product_media_workspace ON inventory.product_media(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_product_media_product ON inventory.product_media(product_id);

-- =====================================================
-- 10. Enable RLS and Grants
-- =====================================================

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOR v_table IN
    SELECT unnest(ARRAY[
    'product_categories',
    'brands',
    'units',
    'warehouses',
    'vendors',
    'vendor_contacts',
    'products',
    'product_media'
  ]::TEXT[])
  LOOP
    EXECUTE format('ALTER TABLE inventory.%I ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON inventory.%I', v_table || '_policy', v_table);
    EXECUTE format(
      'CREATE POLICY %I ON inventory.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      v_table || '_policy',
      v_table
    );
    EXECUTE format('GRANT ALL ON inventory.%I TO service_role, authenticated, anon', v_table);
  END LOOP;
END $$;

-- =====================================================
-- 11. updated_at Triggers
-- =====================================================

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOR v_table IN
    SELECT unnest(ARRAY[
    'product_categories',
    'brands',
    'units',
    'warehouses',
    'vendors',
    'vendor_contacts',
    'products'
  ]::TEXT[])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON inventory.%I', 'trg_inv_' || v_table || '_updated_at', v_table);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON inventory.%I FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column()',
      'trg_inv_' || v_table || '_updated_at',
      v_table
    );
  END LOOP;
END $$;

GRANT ALL ON ALL TABLES IN SCHEMA inventory TO authenticated, service_role, anon;
