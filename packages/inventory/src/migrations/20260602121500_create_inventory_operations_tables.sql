/*
 * -------------------------------------------------------
 * Migration: Create Inventory Operations Tables
 * Date: 2026-06-02
 * Description: Creates operational inventory tables used by stock,
 *              purchasing, sales fulfillment, transfers, and audits:
 *                - inventory.stock_batches
 *                - inventory.serial_numbers
 *                - inventory.purchase_requisitions
 *                - inventory.purchase_requisition_items
 *                - inventory.purchase_orders
 *                - inventory.purchase_order_items
 *                - inventory.goods_receipts
 *                - inventory.goods_receipt_items
 *                - inventory.sales_orders
 *                - inventory.sales_order_items
 *                - inventory.stock_levels
 *                - inventory.stock_movements
 *                - inventory.stock_reservations
 *                - inventory.stock_transfers
 *                - inventory.stock_transfer_items
 *                - inventory.stock_audits
 *                - inventory.stock_audit_items
 * -------------------------------------------------------
 */

-- =====================================================
-- 1. Stock Batches
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.stock_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES inventory.products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES inventory.warehouses(id) ON DELETE CASCADE,
  supplier_vendor_id UUID REFERENCES inventory.vendors(id) ON DELETE SET NULL,
  batch_number VARCHAR(120) NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE,
  received_date DATE,
  quantity_received NUMERIC(18, 4) NOT NULL DEFAULT 0,
  quantity_available NUMERIC(18, 4) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(18, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  notes TEXT,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_stock_batches_unique UNIQUE (workspace_id, product_id, warehouse_id, batch_number),
  CONSTRAINT inventory_stock_batches_quantity_check CHECK (quantity_received >= 0 AND quantity_available >= 0),
  CONSTRAINT inventory_stock_batches_expiry_check CHECK (expiry_date IS NULL OR manufacturing_date IS NULL OR expiry_date >= manufacturing_date)
);

COMMENT ON TABLE inventory.stock_batches IS 'Tracks batch-level stock for products that require manufacturing and expiry traceability.';

CREATE INDEX IF NOT EXISTS idx_inv_stock_batches_workspace ON inventory.stock_batches(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_batches_product ON inventory.stock_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_batches_warehouse ON inventory.stock_batches(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_batches_expiry ON inventory.stock_batches(expiry_date) WHERE expiry_date IS NOT NULL;

-- =====================================================
-- 2. Serial Numbers
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.serial_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES inventory.products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES inventory.warehouses(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES inventory.stock_batches(id) ON DELETE SET NULL,
  serial_number VARCHAR(150) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  warranty_start_date DATE,
  warranty_end_date DATE,
  notes TEXT,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_serial_numbers_unique UNIQUE (workspace_id, serial_number),
  CONSTRAINT inventory_serial_numbers_warranty_check CHECK (warranty_end_date IS NULL OR warranty_start_date IS NULL OR warranty_end_date >= warranty_start_date)
);

COMMENT ON TABLE inventory.serial_numbers IS 'Tracks item-level serial numbers for products requiring unique identity and warranty history.';

CREATE INDEX IF NOT EXISTS idx_inv_serial_numbers_workspace ON inventory.serial_numbers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_serial_numbers_product ON inventory.serial_numbers(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_serial_numbers_status ON inventory.serial_numbers(workspace_id, status);

-- =====================================================
-- 3. Purchase Requisitions
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.purchase_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  requisition_number VARCHAR(80) NOT NULL,
  requested_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  department_name VARCHAR(120),
  needed_by_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_purchase_requisitions_number_unique UNIQUE (workspace_id, requisition_number)
);

COMMENT ON TABLE inventory.purchase_requisitions IS 'Internal inventory purchase requests raised before vendor purchase orders are created.';

CREATE INDEX IF NOT EXISTS idx_inv_purchase_requisitions_workspace ON inventory.purchase_requisitions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_purchase_requisitions_status ON inventory.purchase_requisitions(workspace_id, status);

CREATE TABLE IF NOT EXISTS inventory.purchase_requisition_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  requisition_id UUID NOT NULL REFERENCES inventory.purchase_requisitions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES inventory.products(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES inventory.units(id) ON DELETE SET NULL,
  preferred_vendor_id UUID REFERENCES inventory.vendors(id) ON DELETE SET NULL,
  quantity_requested NUMERIC(18, 4) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_purchase_requisition_items_quantity_check CHECK (quantity_requested > 0)
);

COMMENT ON TABLE inventory.purchase_requisition_items IS 'Line items attached to internal purchase requisitions.';

CREATE INDEX IF NOT EXISTS idx_inv_purchase_requisition_items_workspace ON inventory.purchase_requisition_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_purchase_requisition_items_requisition ON inventory.purchase_requisition_items(requisition_id);

-- =====================================================
-- 4. Purchase Orders
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  requisition_id UUID REFERENCES inventory.purchase_requisitions(id) ON DELETE SET NULL,
  vendor_id UUID NOT NULL REFERENCES inventory.vendors(id) ON DELETE RESTRICT,
  warehouse_id UUID REFERENCES inventory.warehouses(id) ON DELETE SET NULL,
  po_number VARCHAR(80) NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  subtotal_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  payment_terms VARCHAR(120),
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  approved_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_purchase_orders_number_unique UNIQUE (workspace_id, po_number)
);

COMMENT ON TABLE inventory.purchase_orders IS 'Purchase orders sent to vendors for stock procurement.';

CREATE INDEX IF NOT EXISTS idx_inv_purchase_orders_workspace ON inventory.purchase_orders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_purchase_orders_vendor ON inventory.purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_inv_purchase_orders_status ON inventory.purchase_orders(workspace_id, status);

CREATE TABLE IF NOT EXISTS inventory.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES inventory.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES inventory.products(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES inventory.units(id) ON DELETE SET NULL,
  quantity_ordered NUMERIC(18, 4) NOT NULL,
  quantity_received NUMERIC(18, 4) NOT NULL DEFAULT 0,
  unit_price NUMERIC(18, 2) NOT NULL DEFAULT 0,
  tax_percent NUMERIC(8, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(18, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_purchase_order_items_quantity_check CHECK (quantity_ordered > 0 AND quantity_received >= 0)
);

COMMENT ON TABLE inventory.purchase_order_items IS 'Line items for vendor purchase orders.';

CREATE INDEX IF NOT EXISTS idx_inv_purchase_order_items_workspace ON inventory.purchase_order_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_purchase_order_items_po ON inventory.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_inv_purchase_order_items_product ON inventory.purchase_order_items(product_id);

-- =====================================================
-- 5. Goods Receipts
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES inventory.purchase_orders(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES inventory.warehouses(id) ON DELETE SET NULL,
  grn_number VARCHAR(80) NOT NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  quality_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_goods_receipts_number_unique UNIQUE (workspace_id, grn_number)
);

COMMENT ON TABLE inventory.goods_receipts IS 'Goods receipt notes used to record inbound inventory against purchase orders.';

CREATE INDEX IF NOT EXISTS idx_inv_goods_receipts_workspace ON inventory.goods_receipts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_goods_receipts_po ON inventory.goods_receipts(purchase_order_id) WHERE purchase_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_goods_receipts_status ON inventory.goods_receipts(workspace_id, status);

CREATE TABLE IF NOT EXISTS inventory.goods_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  goods_receipt_id UUID NOT NULL REFERENCES inventory.goods_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id UUID REFERENCES inventory.purchase_order_items(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES inventory.products(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES inventory.stock_batches(id) ON DELETE SET NULL,
  quantity_received NUMERIC(18, 4) NOT NULL,
  quantity_accepted NUMERIC(18, 4) NOT NULL DEFAULT 0,
  quantity_rejected NUMERIC(18, 4) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(18, 2),
  manufacturing_date DATE,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_goods_receipt_items_quantity_check CHECK (
    quantity_received > 0
    AND quantity_accepted >= 0
    AND quantity_rejected >= 0
    AND quantity_accepted + quantity_rejected <= quantity_received
  )
);

COMMENT ON TABLE inventory.goods_receipt_items IS 'Received quantities for each product line in a goods receipt note.';

CREATE INDEX IF NOT EXISTS idx_inv_goods_receipt_items_workspace ON inventory.goods_receipt_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_goods_receipt_items_grn ON inventory.goods_receipt_items(goods_receipt_id);
CREATE INDEX IF NOT EXISTS idx_inv_goods_receipt_items_product ON inventory.goods_receipt_items(product_id);

-- =====================================================
-- 6. Sales Orders
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sales_order_number VARCHAR(80) NOT NULL,
  crm_account_id UUID REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  crm_contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  crm_opportunity_id UUID REFERENCES public.crm_opportunities(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES inventory.warehouses(id) ON DELETE SET NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_dispatch_date DATE,
  dispatch_date DATE,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  subtotal_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  dispatch_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  tracking_number VARCHAR(120),
  shipping_partner VARCHAR(120),
  notes TEXT,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_sales_orders_number_unique UNIQUE (workspace_id, sales_order_number)
);

COMMENT ON TABLE inventory.sales_orders IS 'Sales orders used to reserve stock, fulfill inventory, and dispatch goods against CRM demand.';

CREATE INDEX IF NOT EXISTS idx_inv_sales_orders_workspace ON inventory.sales_orders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_sales_orders_status ON inventory.sales_orders(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_inv_sales_orders_opportunity ON inventory.sales_orders(crm_opportunity_id) WHERE crm_opportunity_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS inventory.sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sales_order_id UUID NOT NULL REFERENCES inventory.sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES inventory.products(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES inventory.units(id) ON DELETE SET NULL,
  quantity_ordered NUMERIC(18, 4) NOT NULL,
  quantity_reserved NUMERIC(18, 4) NOT NULL DEFAULT 0,
  quantity_fulfilled NUMERIC(18, 4) NOT NULL DEFAULT 0,
  unit_price NUMERIC(18, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(18, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_sales_order_items_quantity_check CHECK (
    quantity_ordered > 0
    AND quantity_reserved >= 0
    AND quantity_fulfilled >= 0
  )
);

COMMENT ON TABLE inventory.sales_order_items IS 'Line items for sales orders that drive stock reservation and fulfillment.';

CREATE INDEX IF NOT EXISTS idx_inv_sales_order_items_workspace ON inventory.sales_order_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_sales_order_items_sales_order ON inventory.sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_inv_sales_order_items_product ON inventory.sales_order_items(product_id);

-- =====================================================
-- 7. Stock Levels
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES inventory.products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES inventory.warehouses(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES inventory.stock_batches(id) ON DELETE SET NULL,
  quantity_on_hand NUMERIC(18, 4) NOT NULL DEFAULT 0,
  quantity_reserved NUMERIC(18, 4) NOT NULL DEFAULT 0,
  last_movement_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_stock_levels_batched_unique UNIQUE (workspace_id, product_id, warehouse_id, batch_id),
  CONSTRAINT inventory_stock_levels_quantities_check CHECK (quantity_on_hand >= 0 AND quantity_reserved >= 0)
);

COMMENT ON TABLE inventory.stock_levels IS 'Denormalized current stock snapshot used for fast product and warehouse stock lookups.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_stock_levels_unbatched_unique
  ON inventory.stock_levels(workspace_id, product_id, warehouse_id)
  WHERE batch_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_inv_stock_levels_workspace ON inventory.stock_levels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_levels_product ON inventory.stock_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_levels_warehouse ON inventory.stock_levels(warehouse_id);

-- =====================================================
-- 8. Stock Movements
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES inventory.products(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES inventory.stock_batches(id) ON DELETE SET NULL,
  serial_number_id UUID REFERENCES inventory.serial_numbers(id) ON DELETE SET NULL,
  movement_type VARCHAR(60) NOT NULL,
  movement_direction VARCHAR(20) NOT NULL,
  quantity NUMERIC(18, 4) NOT NULL,
  unit_cost NUMERIC(18, 2),
  total_cost NUMERIC(18, 2),
  reference_type VARCHAR(80),
  reference_id UUID,
  reason VARCHAR(120),
  notes TEXT,
  moved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_stock_movements_quantity_check CHECK (quantity > 0),
  CONSTRAINT inventory_stock_movements_direction_check CHECK (movement_direction IN ('in', 'out'))
);

COMMENT ON TABLE inventory.stock_movements IS 'Immutable stock ledger used to track every stock-in and stock-out event.';

CREATE INDEX IF NOT EXISTS idx_inv_stock_movements_workspace ON inventory.stock_movements(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_movements_product ON inventory.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_movements_warehouse ON inventory.stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_movements_moved_at ON inventory.stock_movements(workspace_id, moved_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_stock_movements_reference ON inventory.stock_movements(reference_type, reference_id) WHERE reference_id IS NOT NULL;

-- =====================================================
-- 9. Stock Reservations
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sales_order_id UUID REFERENCES inventory.sales_orders(id) ON DELETE SET NULL,
  sales_order_item_id UUID REFERENCES inventory.sales_order_items(id) ON DELETE SET NULL,
  customer_account_id UUID REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES inventory.products(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES inventory.stock_batches(id) ON DELETE SET NULL,
  quantity_reserved NUMERIC(18, 4) NOT NULL,
  quantity_released NUMERIC(18, 4) NOT NULL DEFAULT 0,
  reserved_for_type VARCHAR(60) NOT NULL DEFAULT 'sales_order',
  reserved_for_id UUID,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_stock_reservations_quantity_check CHECK (
    quantity_reserved > 0
    AND quantity_released >= 0
    AND quantity_released <= quantity_reserved
  )
);

COMMENT ON TABLE inventory.stock_reservations IS 'Tracks reserved quantities held aside for sales orders, projects, or customer commitments.';

CREATE INDEX IF NOT EXISTS idx_inv_stock_reservations_workspace ON inventory.stock_reservations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_reservations_product ON inventory.stock_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_reservations_status ON inventory.stock_reservations(workspace_id, status);

-- =====================================================
-- 10. Stock Transfers
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  transfer_number VARCHAR(80) NOT NULL,
  source_warehouse_id UUID NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
  destination_warehouse_id UUID NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
  requested_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  dispatched_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  received_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_stock_transfers_number_unique UNIQUE (workspace_id, transfer_number),
  CONSTRAINT inventory_stock_transfers_warehouse_check CHECK (source_warehouse_id <> destination_warehouse_id)
);

COMMENT ON TABLE inventory.stock_transfers IS 'Inter-warehouse transfer headers used to move stock between storage locations.';

CREATE INDEX IF NOT EXISTS idx_inv_stock_transfers_workspace ON inventory.stock_transfers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_transfers_status ON inventory.stock_transfers(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_inv_stock_transfers_source ON inventory.stock_transfers(source_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_transfers_destination ON inventory.stock_transfers(destination_warehouse_id);

CREATE TABLE IF NOT EXISTS inventory.stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  transfer_id UUID NOT NULL REFERENCES inventory.stock_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES inventory.products(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES inventory.stock_batches(id) ON DELETE SET NULL,
  quantity_requested NUMERIC(18, 4) NOT NULL,
  quantity_dispatched NUMERIC(18, 4) NOT NULL DEFAULT 0,
  quantity_received NUMERIC(18, 4) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_stock_transfer_items_quantity_check CHECK (
    quantity_requested > 0
    AND quantity_dispatched >= 0
    AND quantity_received >= 0
  )
);

COMMENT ON TABLE inventory.stock_transfer_items IS 'Line items attached to stock transfer workflows.';

CREATE INDEX IF NOT EXISTS idx_inv_stock_transfer_items_workspace ON inventory.stock_transfer_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_transfer_items_transfer ON inventory.stock_transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_transfer_items_product ON inventory.stock_transfer_items(product_id);

-- =====================================================
-- 11. Stock Audits
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory.stock_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES inventory.warehouses(id) ON DELETE SET NULL,
  audit_number VARCHAR(80) NOT NULL,
  audit_type VARCHAR(50) NOT NULL DEFAULT 'physical_count',
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  conducted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_stock_audits_number_unique UNIQUE (workspace_id, audit_number)
);

COMMENT ON TABLE inventory.stock_audits IS 'Inventory audit headers for physical counts, cycle counts, and variance reviews.';

CREATE INDEX IF NOT EXISTS idx_inv_stock_audits_workspace ON inventory.stock_audits(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_audits_status ON inventory.stock_audits(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_inv_stock_audits_warehouse ON inventory.stock_audits(warehouse_id) WHERE warehouse_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS inventory.stock_audit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  audit_id UUID NOT NULL REFERENCES inventory.stock_audits(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES inventory.products(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES inventory.stock_batches(id) ON DELETE SET NULL,
  system_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
  counted_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
  variance_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
  variance_reason VARCHAR(120),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE inventory.stock_audit_items IS 'Inventory audit line items storing counted stock and variance results.';

CREATE INDEX IF NOT EXISTS idx_inv_stock_audit_items_workspace ON inventory.stock_audit_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_audit_items_audit ON inventory.stock_audit_items(audit_id);
CREATE INDEX IF NOT EXISTS idx_inv_stock_audit_items_product ON inventory.stock_audit_items(product_id);

-- =====================================================
-- 12. Enable RLS and Grants
-- =====================================================

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOR v_table IN
    SELECT unnest(ARRAY[
    'stock_batches',
    'serial_numbers',
    'purchase_requisitions',
    'purchase_requisition_items',
    'purchase_orders',
    'purchase_order_items',
    'goods_receipts',
    'goods_receipt_items',
    'sales_orders',
    'sales_order_items',
    'stock_levels',
    'stock_movements',
    'stock_reservations',
    'stock_transfers',
    'stock_transfer_items',
    'stock_audits',
    'stock_audit_items'
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
-- 13. updated_at Triggers
-- =====================================================

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOR v_table IN
    SELECT unnest(ARRAY[
    'stock_batches',
    'serial_numbers',
    'purchase_requisitions',
    'purchase_requisition_items',
    'purchase_orders',
    'purchase_order_items',
    'goods_receipts',
    'goods_receipt_items',
    'sales_orders',
    'sales_order_items',
    'stock_levels',
    'stock_reservations',
    'stock_transfers',
    'stock_transfer_items',
    'stock_audits',
    'stock_audit_items'
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
